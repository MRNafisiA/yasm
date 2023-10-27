import { produce } from 'immer';
import { YasmContext } from './Context';
import { Path, Section, Store, Name } from './createStore';
import { useCallback, useContext, useSyncExternalStore } from 'react';

const useYasmState = <
    SectionMap extends Record<Name, Section>,
    N extends keyof SectionMap,
    State
>(
    name: N,
    path: Path,
    selector?: (state: SectionMap[N]['state']) => State
): [
    unknown extends State ? SectionMap[N]['state'] : State,
    (
        payload:
            | Parameters<SectionMap[N]['updater']>[1]
            | ((
                  state: SectionMap[N]['state']
              ) => Parameters<SectionMap[N]['updater']>[1])
    ) => SectionMap[N]['state'] | void
] => {
    const store = useContext(YasmContext) as Store<SectionMap>;
    if (store.state[name][path] === undefined) {
        (store.state[name] as Record<Path, SectionMap[N]['state']>)[path] =
            store.sectionMap[name].state;
    }
    const state = useSyncExternalStore(
        useCallback(
            (callback: () => void) => store.subscribe(callback, name, path),
            [store, name, path]
        ),
        useCallback(() => {
            const tmp = store.state[name][path];
            return selector !== undefined ? selector(tmp) : tmp;
        }, [store, name, path, selector])
    );
    const updater = useCallback(
        (
            payload:
                | Parameters<SectionMap[N]['updater']>[1]
                | ((
                      state: SectionMap[N]['state']
                  ) => Parameters<SectionMap[N]['updater']>[1])
        ) => {
            const _payload =
                typeof payload === 'function'
                    ? (
                          payload as (
                              state: SectionMap[N]['state']
                          ) => Parameters<SectionMap[N]['updater']>[1]
                      )(store.state[name][path])
                    : payload;
            if (process.env.NODE_ENV !== 'production') {
                console.debug(`${name as string} ${path}`);
                console.debug(JSON.parse(JSON.stringify(_payload)));
                console.debug('before:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
            }
            (store.state[name] as Record<Path, SectionMap[N]['state']>)[path] =
                produce(store.state[name][path], (draft: any) =>
                    store.sectionMap[name].updater(draft, _payload)
                );
            if (process.env.NODE_ENV !== 'production') {
                console.debug('after:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
                console.debug('--------');
            }
            for (const key in store.subscribers[name][path]) {
                store.subscribers[name][path][key]();
            }
        },
        [store, name, path]
    );
    return [state, updater];
};

export { useYasmState };
