import { YasmContext } from './Context';
import { useCallback, useContext } from 'react';
import { snapshot } from './util';

const usePurgeYasmState = () => {
    const store = useContext(YasmContext);
    return useCallback(
        (pathStartsWith: string) => {
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`purging path starts with ${pathStartsWith}`);
                console.debug('before:');
                snapshot(store.state);
            }
            for (const name in store.state) {
                for (const path in store.state[name]) {
                    if (path.startsWith(pathStartsWith)) {
                        delete store.state[name][path];
                        delete store.subscribers[name][path];
                    }
                }
            }
            for (const name in store.memo) {
                for (const path in store.memo[name]) {
                    if (path.startsWith(pathStartsWith)) {
                        delete store.memo[name][path];
                    }
                }
            }
            for (const name in store.pathRegistry) {
                store.pathRegistry[name] = store.pathRegistry[name].filter(
                    path => !path.startsWith(pathStartsWith)
                );
            }
            if (process.env.NODE_ENV !== 'production') {
                console.debug('after:');
                snapshot(store.state);
                console.debug('--------');
            }
        },
        [store]
    );
};

export { usePurgeYasmState };
