import { Selector } from './createStore';
import { YasmContext } from './Provider';
import { useCallback, useContext, useSyncExternalStore } from 'react';

const useYasmSelector = <
    SelectorID extends string,
    Selectors extends Record<SelectorID, Selector>,
    Key extends keyof ReturnType<Selectors[SelectorID]>
>(
    ...[selectorID, key, payload]: Parameters<
        Selectors[SelectorID]
    >[1] extends undefined
        ? [SelectorID, Key]
        : [SelectorID, Key, Parameters<Selectors[SelectorID]>[1]]
) => {
    const store = useContext(YasmContext);
    const getSnapshot = useCallback(
        () =>
            (store.selectors as Selectors)[selectorID](store.state.v, payload)[
                key as keyof ReturnType<Selector>
            ] as ReturnType<Selectors[SelectorID]>[Key],
        [store, selectorID, payload, key]
    );
    return useSyncExternalStore(store.subscribe, getSnapshot);
};

export { useYasmSelector };
