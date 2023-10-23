import { Store } from './createStore';
import { createContext, ReactNode } from 'react';

const YasmContext = createContext(
    undefined as unknown as Store<any, Record<string, any>, Record<string, any>>
);

const YasmProvider = ({
    store,
    children
}: {
    store: Store<any, Record<string, any>, Record<string, any>>;
    children?: ReactNode | undefined;
}) => <YasmContext.Provider value={store}>{children}</YasmContext.Provider>;

export { YasmContext, YasmProvider };
