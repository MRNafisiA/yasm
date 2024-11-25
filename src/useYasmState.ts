import { produce } from 'immer';
import { YasmContext } from './Context';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import {
    Name,
    Path,
    PayloadAndPayloadCreator,
    Section,
    StateBySectionMap,
    Store
} from './createStore';
import { snapshot } from './util';

// Overload 1: Basic use (no selector) or use with a selector
function useYasmState<SM extends Record<Name, Section>, N extends keyof SM, S>(
    name: N,
    path: Path,
    selector?: (state: SM[N]['initialState']) => S
): [
    unknown extends S ? SM[N]['initialState'] : S,
    (payload: PayloadAndPayloadCreator<SM, N>) => SM[N]['initialState'] | void
];

// Overload 2: Use with options object (selector and/or overrideInitialState)
function useYasmState<SM extends Record<Name, Section>, N extends keyof SM, S>(
    name: N,
    path: Path,
    options: {
        selector?: (state: SM[N]['initialState']) => S;
        overrideInitialState?: Partial<SM[N]['initialState']>;
    }
): [
    unknown extends S ? SM[N]['initialState'] : S,
    (payload: PayloadAndPayloadCreator<SM, N>) => SM[N]['initialState'] | void
];

function useYasmState<SM extends Record<Name, Section>, N extends keyof SM, S>(
    name: N,
    path: Path,
    thirdParam?:
        | ((state: SM[N]['initialState']) => S)
        | {
              selector?: (state: SM[N]['initialState']) => S;
              overrideInitialState?: Partial<SM[N]['initialState']>;
          }
): [
    unknown extends S ? SM[N]['initialState'] : S,
    (payload: PayloadAndPayloadCreator<SM, N>) => SM[N]['initialState'] | void
] {
    const store = useContext(YasmContext) as Store<SM>;

    let selector: ((state: SM[N]['initialState']) => S) | undefined;
    let overrideInitialState: Partial<SM[N]['initialState']> | undefined;

    if (typeof thirdParam === 'function') {
        selector = thirdParam;
    } else if (thirdParam && typeof thirdParam === 'object') {
        selector = thirdParam.selector;
        overrideInitialState = thirdParam.overrideInitialState;
    }

    if (store.memo[name][path] === undefined) {
        init(store, name, path, overrideInitialState);
    }

    const getState = store.memo[name][path].getState;

    return [
        useSyncExternalStore(
            store.memo[name][path].subscribe,
            useCallback(() => {
                const state = getState();
                return selector !== undefined ? selector(state) : state;
            }, [getState, selector])
        ),
        store.memo[name][path].updater
    ];
}

const init = <SM extends Record<Name, Section>, N extends keyof SM>(
    store: Store<SM>,
    name: N,
    path: Path,
    overrideInitialState?: Partial<SM[N]['initialState']>
) => {
    const [routedName, routedPath, getState, updater] = route(
        store,
        name,
        path
    );

    if (name === routedName && store.state[name][path] === undefined) {
        (store.state[name] as Record<Path, SM[N]['initialState']>)[path] = {
            ...store.sectionMap[name].initialState,
            ...overrideInitialState
        };

        if (store.sectionMap[name].routing !== undefined) {
            store.pathRegistry[name as Name].push(path);
        }
    }

    store.memo[name as Name][path] = {
        subscribe: callback =>
            store.subscribe(callback, routedName, routedPath),
        getState,
        updater: payload => {
            const _payload =
                typeof payload === 'function'
                    ? (
                          payload as (
                              state: SM[N]['initialState']
                          ) => Parameters<SM[N]['updater']>[1]
                      )(getState())
                    : payload;

            if (process.env.NODE_ENV !== 'production') {
                console.debug('----start----');
                console.debug(
                    `${name as Name} ${path}${
                        name !== routedName
                            ? ` (${routedName} ${routedPath})`
                            : ''
                    }`
                );
                snapshot(_payload);
                console.debug('before:');
                snapshot(store.state);
            }

            store.state[routedName][routedPath] = updater(_payload);

            if (process.env.NODE_ENV !== 'production') {
                console.debug('after:');
                snapshot(store.state);
                console.debug('----end----');
            }

            for (const key in store.subscribers[routedName][routedPath]) {
                store.subscribers[routedName][routedPath][key]();
            }
        }
    };
};

const route = <SM extends Record<Name, Section>, N extends keyof SM>(
    store: Store<SM>,
    name: N,
    path: Path
): [
    routedName: Name,
    routedPath: Path,
    getState: () => SM[N]['initialState'],
    updater: (payload: Parameters<SM[N]['updater']>[1]) => SM[N]['initialState']
] => {
    const extraRoutes = getExtraRoutes(store, [name as Name], path);
    if (extraRoutes !== undefined) {
        return extraRoutes;
    }
    return [
        name as Name,
        path,
        () => store.state[name][path],
        payload =>
            produce(store.state[name][path], (draft: any) =>
                store.sectionMap[name].updater(draft, payload)
            )
    ];
};

const getExtraRoutes = <SM extends Record<Name, Section>, N extends keyof SM>(
    store: Store<SM>,
    names: Name[],
    path: Path
):
    | [
          routedName: Name,
          routedPath: Path,
          getState: () => SM[N]['initialState'],
          updater: (
              payload: Parameters<SM[N]['updater']>[1]
          ) => SM[N]['initialState']
      ]
    | undefined => {
    const firstName = names[0];
    if (process.env.NODE_ENV !== 'production') {
        const getAllPathRegistry = (names: Name[] | undefined) => {
            const allPaths: Path[] = [];
            if (names === undefined || names.length === 0) {
                return allPaths;
            }
            for (const name of names) {
                allPaths.push(
                    ...store.pathRegistry[name].filter(v => path.startsWith(v)),
                    ...getAllPathRegistry(store.routingPlan[name])
                );
            }
            return allPaths;
        };
        const allPaths = getAllPathRegistry(store.routingPlan[firstName]);
        if (allPaths.length > 1) {
            console.error(
                'multiple routing candidates found.\n' +
                    'your direct paths can not be suffix of each other.\n' +
                    `paths: ${JSON.stringify(allPaths)}`
            );
        }
    }
    for (const name of store.routingPlan[firstName] ?? []) {
        const foundPath = store.pathRegistry[name].find(v =>
            path.startsWith(v)
        );
        if (foundPath !== undefined) {
            const allNames = [name, ...names];
            const selectByPathQuery = allNames.reduce(
                (pre, current, i) => {
                    if (i === names.length) {
                        return pre;
                    }
                    return (state, pathQuery) =>
                        store.sectionMap[current].routing![
                            names[i]
                        ].selectByPathQuery(...pre(state, pathQuery));
                },
                (state: StateBySectionMap<SM>, pathQuery: string) =>
                    [state[name][foundPath], pathQuery] as [
                        SM[N]['initialState'],
                        string
                    ]
            );
            const reversedAllNames = allNames.reverse();
            const updateByPathQuery = reversedAllNames.reduce(
                (pre, current, i) => {
                    if (i === names.length) {
                        return pre;
                    }
                    return (state, pathQuery, payload) =>
                        store.sectionMap[reversedAllNames[i + 1]].routing![
                            current
                        ].updateByPathQuery(
                            state,
                            pathQuery,
                            (state, pathQuery) => pre(state, pathQuery, payload)
                        );
                },
                (
                    state: unknown,
                    pathQuery: string,
                    payload: Parameters<SM[N]['updater']>[1]
                ): SM[N]['initialState'] => {
                    if (process.env.NODE_ENV !== 'production') {
                        if (pathQuery !== '') {
                            console.error(
                                `updaters did not consume all of the pathQuery. remaining pathQuery:${pathQuery}, names: ${JSON.stringify(
                                    name
                                )}, name: ${name}, path:${path}`
                            );
                        }
                    }
                    return produce(state, draft =>
                        store.sectionMap[names[names.length - 1]].updater(
                            draft,
                            payload
                        )
                    );
                }
            );
            const pathQuery = path.slice(foundPath.length);
            return [
                name,
                foundPath,
                () => {
                    const [selectedState, remainedPathQuery] =
                        selectByPathQuery(store.state, pathQuery);
                    if (process.env.NODE_ENV !== 'production') {
                        if (remainedPathQuery !== '') {
                            console.error(
                                `selectors did not consume all of the pathQuery. remaining pathQuery:${remainedPathQuery}, names: ${JSON.stringify(
                                    name
                                )}, name: ${name}, path:${path}`
                            );
                        }
                    }
                    return selectedState;
                },
                payload =>
                    updateByPathQuery(
                        store.state[name][foundPath],
                        pathQuery,
                        payload
                    )
            ];
        }
        const routingInfo = getExtraRoutes(store, [name, ...names], path);
        if (routingInfo !== undefined) {
            return routingInfo;
        }
    }
    return undefined;
};

export { useYasmState, init, route, getExtraRoutes };
