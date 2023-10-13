import { createContext } from 'react';

const YasmContext = createContext(undefined);

const YasmProvider = ({ store, children }) => (
    <YasmContext.Provider value={store}>{children}</YasmContext.Provider>
);

export { YasmContext, YasmProvider };
