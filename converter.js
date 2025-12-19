const fs = require('fs');

function parseMermaidSequence(mermaidCode) {
    const lines = mermaidCode.split('\n').map(line => line.trim()).filter(line => line);
    const participants = [];
    const messages = [];
    const notes = [];
    const loops = [];
    
    let currentLoop = null;
    let loopStack = [];

    lines.forEach((line, index) => {
        if (line.startsWith('participant ')) {
            const match = line.match(/participant (\w+) as (.+)/);
            if (match) {
                participants.push({ id: match[1], label: match[2] });
            }
        } else if (line.startsWith('Note ')) {
            const match = line.match(/Note (over|right of|left of) (.+): (.+)/);
            if (match) {
                const [, position, targets, text] = match;
                notes.push({ position, targets, text });
            }
        } else if (line.startsWith('loop ')) {
            const match = line.match(/loop (.+)/);
            if (match) {
                currentLoop = {
                    text: match[1],
                    messages: [],
                    startIndex: messages.length
                };
                loopStack.push(currentLoop);
            }
        } else if (line === 'end') {
            if (loopStack.length > 0) {
                const completedLoop = loopStack.pop();
                completedLoop.endIndex = messages.length - 1;
                loops.push(completedLoop);
                currentLoop = loopStack[loopStack.length - 1] || null;
            }
        } else if (line.includes('->>') || line.includes('-->>') || line.includes('->') || line.includes('-->')) {
            const match = line.match(/(\w+)(->>|-->>|->|-->|-\)|-x)(\w+): (.+)/);
            if (match) {
                const [, from, arrow, to, text] = match;
                let style = 'html=1;verticalAlign=bottom;endArrow=';
                if (arrow === '->>') style += 'block;curved=0;rounded=0;';
                else if (arrow === '-->>') style += 'open;curved=0;rounded=0;dashed=1;';
                else if (arrow === '->') style += 'block;curved=0;rounded=0;';
                else if (arrow === '-->') style += 'open;curved=0;rounded=0;dashed=1;';
                const message = { from, to, text, style };
                messages.push(message);
                
                // Associate with current loop if we're in one
                if (currentLoop) {
                    currentLoop.messages.push(message);
                }
            }
        }
    });

    return { participants, messages, notes, loops };
}

function generateDrawioXML(participants, messages, notes, loops) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Mermaid-Converter" version="21.0.0">
  <diagram name="Sequence Diagram" id="diagram_${Date.now()}">
    <mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="800" pageHeight="400" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>`;

    let y = 20;
    const spacing = 180;
    let x = 80;

    participants.forEach((p, index) => {
        // Participant box
        xml += `
        <mxCell id="${p.id}" value="${p.label}" style="rounded=0;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="100" height="50" as="geometry"/>
        </mxCell>`;
        // Lifeline
        xml += `
        <mxCell id="${p.id}_lifeline" style="html=1;points=[];perimeter=orthogonalPerimeter;outlineConnect=0;targetShapes=umlLifeline;portConstraint=eastwest;newEdgeStyle={&quot;curved&quot;:0,&quot;rounded&quot;:0};dashed=1;dashPattern=8 8;strokeWidth=1;strokeColor=#666666;" vertex="1" parent="1">
          <mxGeometry x="${x + 49}" y="${y + 60}" width="2" height="300" as="geometry"/>
        </mxCell>`;
        x += spacing;
    });

    let msgY = 110;
    messages.forEach((msg, index) => {
        const fromIndex = participants.findIndex(p => p.id === msg.from);
        const toIndex = participants.findIndex(p => p.id === msg.to);
        if (fromIndex !== -1 && toIndex !== -1) {
            const fromX = 80 + fromIndex * spacing + 50;
            const toX = 80 + toIndex * spacing + 50;
            xml += `
        <mxCell id="msg${index + 2}" value="${msg.text}" style="${msg.style}" edge="1" parent="1">
          <mxGeometry relative="1" as="geometry">
            <mxPoint x="${fromX}" y="${msgY}" as="sourcePoint"/>
            <mxPoint x="${toX}" y="${msgY}" as="targetPoint"/>
          </mxGeometry>
        </mxCell>`;
            msgY += 60;
        }
    });

    // Render loops
    loops.forEach((loop, index) => {
        if (loop.startIndex <= loop.endIndex) {
            const firstMsgIndex = loop.startIndex;
            const lastMsgIndex = loop.endIndex;
            
            // Calculate loop boundaries
            const firstMsg = messages[firstMsgIndex];
            const lastMsg = messages[lastMsgIndex];
            
            const firstFromIndex = participants.findIndex(p => p.id === firstMsg.from);
            const lastToIndex = participants.findIndex(p => p.id === lastMsg.to);
            
            const leftX = Math.min(...loop.messages.map(msg => {
                const fromIdx = participants.findIndex(p => p.id === msg.from);
                const toIdx = participants.findIndex(p => p.id === msg.to);
                return Math.min(80 + fromIdx * 180 + 30, 80 + toIdx * 180 + 30);
            })) - 20;
            
            const rightX = Math.max(...loop.messages.map(msg => {
                const fromIdx = participants.findIndex(p => p.id === msg.from);
                const toIdx = participants.findIndex(p => p.id === msg.to);
                return Math.max(80 + fromIdx * 180 + 70, 80 + toIdx * 180 + 70);
            })) + 20;
            
            const topY = 110 + firstMsgIndex * 60 - 30;
            const bottomY = 110 + (lastMsgIndex + 1) * 60 + 10;
            
            xml += `
        <mxCell id="loop${index}" value="${loop.text}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#e1d5e7;strokeColor=#9673a6;fontStyle=1;" vertex="1" parent="1">
          <mxGeometry x="${leftX}" y="${topY}" width="${rightX - leftX}" height="${bottomY - topY}" as="geometry"/>
        </mxCell>`;
        }
    });

    let noteY = msgY + 20;
    notes.forEach((note, index) => {
        let noteX, noteWidth;
        if (note.position === 'over') {
            const targetIds = note.targets.split(',');
            const firstIndex = participants.findIndex(p => p.id === targetIds[0].trim());
            const lastIndex = participants.findIndex(p => p.id === targetIds[targetIds.length - 1].trim());
            if (firstIndex !== -1 && lastIndex !== -1) {
                noteX = 80 + firstIndex * spacing;
                noteWidth = (lastIndex - firstIndex + 1) * spacing - 80;
            }
        } else if (note.position === 'right of') {
            const targetIndex = participants.findIndex(p => p.id === note.targets.trim());
            if (targetIndex !== -1) {
                noteX = 80 + targetIndex * spacing + 110;
                noteWidth = 150;
            }
        }
        if (noteX !== undefined) {
            xml += `
        <mxCell id="note${index}" value="${note.text}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;fontStyle=0;" vertex="1" parent="1">
          <mxGeometry x="${noteX}" y="${noteY}" width="${noteWidth}" height="40" as="geometry"/>
        </mxCell>`;
            noteY += 60;
        }
    });

    xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    return xml;
}

function convertMermaidToDrawio(mermaidCode) {
    const { participants, messages, notes, loops } = parseMermaidSequence(mermaidCode);
    return generateDrawioXML(participants, messages, notes, loops);
}

// Example usage
if (require.main === module) {
    let mermaidCode;
    if (process.argv[2]) {
        // Read from file
        mermaidCode = fs.readFileSync(process.argv[2], 'utf8');
    } else {
        // Default example
        mermaidCode = `sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello
    B-->>A: Hi back`;
    }

    const xml = convertMermaidToDrawio(mermaidCode);
    console.log(xml);
    // Write to file
    const outputFile = process.argv[3] || 'output.drawio.xml';
    fs.writeFileSync(outputFile, xml);
    console.log(`XML written to ${outputFile}`);
}

module.exports = { convertMermaidToDrawio };
