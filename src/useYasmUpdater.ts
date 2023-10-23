import { produce } from 'immer';
import { YasmContext } from './Provider';
import { useCallback, useContext } from 'react';
import { Selector, Updater } from './createStore';

const useYasmUpdater = <
    SelectorID extends string,
    UpdaterID extends string,
    Updaters extends Record<UpdaterID, Updater>,
    Selectors extends Record<SelectorID, Selector>,
    Key extends keyof ReturnType<Selectors[SelectorID]>
>(
    ...[selectorID, key, updaterID, selectorPayload]: Parameters<
        Selectors[SelectorID]
    >[1] extends undefined
        ? [SelectorID, Key, UpdaterID]
        : [SelectorID, Key, UpdaterID, Parameters<Selectors[SelectorID]>[1]]
) => {
    const store = useContext(YasmContext);
    return useCallback(
        (payload: Parameters<Updaters[UpdaterID]>[1]) => {
            store.state.v = produce(store.state.v, (draft: any) => {
                const selector = (store.selectors as Selectors)[selectorID];
                const newState = (store.updaters as Updaters)[updaterID](
                    selector(draft, selectorPayload)[
                        key as keyof ReturnType<Selector>
                    ],
                    payload
                );
                if (newState !== undefined) {
                    selector(draft, selectorPayload)[
                        key as keyof ReturnType<Selector>
                    ] = newState;
                }
            });
            store.subscribers.forEach(subscriber => {
                subscriber();
            });
        },
        [store, selectorID, updaterID, selectorPayload, key]
    );
};

export { useYasmUpdater };
