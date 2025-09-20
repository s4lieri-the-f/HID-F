export type NodeType = 
  | 'command'
  | 'key_combination'
  | 'text_input'
  | 'delay'
  | 'loop'
  | 'condition';

export type CommandType =
  | 'GUI'
  | 'ALT'
  | 'CTRL'
  | 'SHIFT'
  | 'TAB'
  | 'ENTER'
  | 'ESCAPE'
  | 'SPACE'
  | 'CAPSLOCK'
  | 'DELETE'
  | 'BACKSPACE'
  | 'PRINTSCREEN'
  | 'SCROLLLOCK'
  | 'PAUSE'
  | 'BREAK'
  | 'INSERT'
  | 'HOME'
  | 'PAGEUP'
  | 'PAGEDOWN'
  | 'END'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12';

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
}

export interface CommandNode extends BaseNode {
  type: 'command';
  command: string; 
}

export interface KeyCombinationNode extends BaseNode {
  type: 'key_combination';
  keys: CommandType[];
  modifiers: ('CTRL' | 'ALT' | 'SHIFT' | 'GUI')[];
}

export interface TextInputNode extends BaseNode {
  type: 'text_input';
  text: string;
  useAltCodes: boolean; 
}

export interface DelayNode extends BaseNode {
  type: 'delay';
  duration: number; 
}

export interface LoopNode extends BaseNode {
  type: 'loop';
  iterations: number;
  children: Node[];
}

export interface ConditionNode extends BaseNode {
  type: 'condition';
  condition: string;
  trueNodes: Node[];
  falseNodes: Node[];
}

export type Node = CommandNode | KeyCombinationNode | TextInputNode | DelayNode | LoopNode | ConditionNode;

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface DuckyScript {
  nodes: Node[];
  connections: Connection[];
  metadata: {
    name: string;
    filename: string;
    description: string;
    created: string;
    modified: string;
  };
}

export const PREDEFINED_COMMANDS = {
  'Open PowerShell (Admin)': 'GUI r\nDELAY 500\nSTRING powershell\nCTRL SHIFT ENTER\nDELAY 1000\nALT y',
  'Open Command Prompt': 'GUI r\nDELAY 500\nSTRING cmd\nENTER',
  'Open Run Dialog': 'GUI r',
  'Open Task Manager': 'CTRL SHIFT ESCAPE',
  'Open File Explorer': 'GUI e',
  'Alt+Tab': 'ALT TAB',
  'Copy': 'CTRL c',
  'Paste': 'CTRL v',
  'Cut': 'CTRL x',
  'Undo': 'CTRL z',
  'Redo': 'CTRL y',
  'Select All': 'CTRL a',
  'Save': 'CTRL s',
  'Print': 'CTRL p',
  'Find': 'CTRL f',
  'New Tab': 'CTRL t',
  'Close Tab': 'CTRL w',
  'Refresh': 'F5',
  'Developer Tools': 'F12'
} as const;
