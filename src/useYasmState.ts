import { produce } from 'immer';
import { YasmContext } from './Context';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { Name, Path, PayloadAndPayloadCreator, Section, StateBySectionMap, Store } from './createStore';

const useYasmState = <SM extends Record<Name, Section>, N extends keyof SM, S>(
    name: N,
    path: Path,
    customSelector?: (state: SM[N]['state']) => S
): [
    unknown extends S ? SM[N]['state'] : S,
    (payload: PayloadAndPayloadCreator<SM, N>) => SM[N]['state'] | void
] => {
    const store = useContext(YasmContext) as Store<SM>;
    if (store.memo[name][path] === undefined) {
        init(store, name, path);
    }
    const getState = store.memo[name][path].getState;
    return [
        useSyncExternalStore(
            store.memo[name][path].subscribe,
            useCallback(() => {
                const state = getState();
                return customSelector !== undefined
                    ? customSelector(state)
                    : state;
            }, [getState, customSelector])
        ),
        store.memo[name][path].updater
    ];
};

const init = <SM extends Record<Name, Section>, N extends keyof SM>(
    store: Store<SM>,
    name: N,
    path: Path
) => {
    const [routedName, routedPath, getState, updater] = route(
        store,
        name,
        path
    );
    if (name === routedName && store.state[name][path] === undefined) {
        (store.state[name] as Record<Path, SM[N]['state']>)[path] =
            store.sectionMap[name].state;
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
                            state: SM[N]['state']
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
                console.debug(JSON.parse(JSON.stringify(_payload)));
                console.debug('before:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
            }
            store.state[routedName][routedPath] = updater(_payload);
            if (process.env.NODE_ENV !== 'production') {
                console.debug('after:');
                console.debug(JSON.parse(JSON.stringify(store.state)));
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
    getState: () => SM[N]['state'],
    updater: (payload: Parameters<SM[N]['updater']>[1]) => SM[N]['state']
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
    getState: () => SM[N]['state'],
    updater: (payload: Parameters<SM[N]['updater']>[1]) => SM[N]['state']
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
                        SM[N]['state'],
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
                ): SM[N]['state'] => {
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
