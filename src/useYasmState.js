import { YasmContext } from './Provider';
import { useYasmSetState } from './useYasmSetState';
import { useCallback, useContext, useSyncExternalStore } from 'react';

const useYasmState = (selector, key) => {
    const store = useContext(YasmContext);
    const getSnapshot = useCallback(() => {
        const tmp = selector(store.state.v);
        return key === undefined ? tmp : tmp[key];
    }, [selector, store, key]);
    const state = useSyncExternalStore(store.subscribe, getSnapshot);

    return [state, useYasmSetState(selector, key)];
};

export { useYasmState };
