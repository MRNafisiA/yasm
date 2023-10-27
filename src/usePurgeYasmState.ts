import { YasmContext } from './Context';
import { useCallback, useContext } from 'react';

const usePurgeYasmState = () => {
    const store = useContext(YasmContext);
    return useCallback(
        (pathStartsWith: string) => {
            if (process.env.NODE_ENV !== 'production') {
                console.debug('before:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
            }
            for (const name in store.state) {
                for (const id in store.state[name]) {
                    if (id.startsWith(pathStartsWith)) {
                        delete store.state[name][id];
                        delete store.subscribers[name][id];
                    }
                }
            }
            if (process.env.NODE_ENV !== 'production') {
                console.debug('after:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
                console.debug('--------');
            }
        },
        [store]
    );
};

export { usePurgeYasmState };
