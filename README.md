# Mermaid to Draw.io Converter

A simple Node.js converter that transforms Mermaid sequence diagram code into Draw.io XML format.

## Installation

Make sure you have Node.js installed.

```bash
npm install
```

## Usage

### Basic Usage

Run the converter with default example:

```bash
node converter.js
```

### Convert from File

Create a file with your Mermaid sequence diagram, e.g., `diagram.mmd`:

```
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello
    B-->>A: Hi back
```

Then run:

```bash
node converter.js diagram.mmd
```

### Specify Output File

```bash
node converter.js diagram.mmd output.xml
```

## Supported Features

- Participants with labels
- Messages: `->>`, `-->>`, `->`, `-->`
- Notes: `Note over A,B: text`, `Note right of A: text`
- Loops: `loop Loop text ... end`
- Basic layout with lifelines

## Importing to Draw.io

1. Open Draw.io
2. File → Import From → Text
3. Paste the generated XML
4. The diagram should appear

## Limitations

- Only basic sequence diagrams supported
- Fixed layout positions
- No support for alt blocks, activations, nested loops, etc. yet
