import { Store } from './createStore';
import { createContext } from 'react';

const YasmContext = createContext(undefined as unknown as Store);

export { YasmContext };
