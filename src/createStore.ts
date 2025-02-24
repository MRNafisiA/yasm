type Name = string;
type Path = string;

type Updater<S = any, P = any> = (state: S, payload: P) => S | void;

type PayloadAndPayloadCreator<
    SM extends Record<Name, Section>,
    N extends keyof SM
> =
    | Parameters<SM[N]['updater']>[1]
    | ((state: SM[N]['initialState']) => Parameters<SM[N]['updater']>[1]);

type Router<S = any, NS = any> = {
    selectByPathQuery: (
        state: S,
        pathQuery: string
    ) => [state: NS, pathQuery: string];
    updateByPathQuery: (
        state: S,
        pathQuery: string,
        getValue: (state: NS, pathQuery: string) => NS
    ) => S;
};

type Routing<S = any> = Record<Name, Router<S>>;

type StateBySectionMap<SM extends Record<Name, Section>> = {
    [name in keyof SM]: Record<Path, SM[name]['initialState']>;
};

type SubscribersBySectionMap<SM extends Record<Name, Section>> = {
    [name in keyof SM]: Record<Path, Record<number, () => void>>;
};

type RoutingPlan<SM extends Record<Name, Section>> = {
    [name in keyof SM]: Name[];
};

type Memo<SM extends Record<Name, Section>> = {
    [name in keyof SM]: Record<
        Path,
        {
            subscribe: (callback: () => void) => () => void;
            getState: () => SM[name]['initialState'];
            updater: (payload: PayloadAndPayloadCreator<SM, name>) => void;
        }
    >;
};

type Section<S = any, P = any> = {
    initialState: S;
    updater: Updater<S, P>;
    routing?: Routing<S>;
};

type DebugOptions = {
    serializer?: (
        object: Record<string, unknown>,
        key: string,
        value: unknown
    ) => any;
    deserializer?: (key: string, value: string) => any;
};

type Store<SM extends Record<Name, Section> = Record<Name, Section>> = {
    state: StateBySectionMap<SM>;
    subscribers: SubscribersBySectionMap<SM>;
    sectionMap: SM;
    subscribe: (callback: () => void, name: keyof SM, path: Path) => () => void;
    pathRegistry: Record<Name, Path[]>;
    routingPlan: RoutingPlan<SM>;
    memo: Memo<SM>;
    debugOptions: DebugOptions;
};

const createStore = <SM extends Record<Name, Section>>(
    sectionMap: SM,
    options?: {
        debugOptions?: DebugOptions;
    }
): Store<SM> => {
    let counter = 0;
    const names: (keyof SM)[] = Object.keys(sectionMap);
    const subscribers = names.reduce((pre, name) => {
        pre[name] = {};
        return pre;
    }, {} as SubscribersBySectionMap<SM>);

    return {
        state: names.reduce((pre, name) => {
            pre[name] = {};
            return pre;
        }, {} as StateBySectionMap<SM>),
        subscribers,
        sectionMap,
        subscribe: (callback, name, path) => {
            const id = counter++;
            if (subscribers[name][path] !== undefined) {
                subscribers[name][path][id] = callback;
            } else {
                (subscribers[name] as Record<Path, Record<number, () => void>>)[
                    path
                ] = {
                    [id]: callback
                };
            }
            return () => {
                if (subscribers[name]?.[path]?.[id] === undefined) {
                    console.warn(
                        [
                            `YASM [Warning]: The state of "${name.toString()}" at path "${path}" has been purged before its dependent components were unmounted!`,
                            `(Dependent components are those that read and use this state.)`,
                            `Ensure that the purge action occurs at the right time (when all dependent components are unmounted) by using "useEffect" or "setTimeout" to prevent premature state purging.`
                        ].join('\n')
                    );
                    return;
                }

                delete subscribers[name][path][id];
            };
        },
        pathRegistry: names.reduce((pre, name) => {
            if (sectionMap[name].routing !== undefined) {
                pre[name as Name] = [];
            }
            return pre;
        }, {} as Record<Name, Path[]>),
        routingPlan: names.reduce((pre, name) => {
            const routing = sectionMap[name].routing;
            if (routing !== undefined) {
                const routingNames = Object.keys(routing);
                for (const routingName of routingNames) {
                    if (process.env.NODE_ENV !== 'production') {
                        if (sectionMap[routingName] === undefined) {
                            console.error(
                                `There is no ${routingName} section to have a route on!`
                            );
                        }
                    }
                    if (pre[routingName] === undefined) {
                        pre[routingName as keyof SM] = [name as Name];
                    } else {
                        pre[routingName].push(name as Name);
                    }
                }
            }
            return pre;
        }, {} as RoutingPlan<SM>),
        memo: names.reduce((pre, name) => {
            pre[name] = {};
            return pre;
        }, {} as Memo<SM>),
        debugOptions: options?.debugOptions ?? {
            serializer: undefined,
            deserializer: undefined
        }
    };
};

export type {
    Name,
    Path,
    Updater,
    PayloadAndPayloadCreator,
    Router,
    Routing,
    StateBySectionMap,
    SubscribersBySectionMap,
    RoutingPlan,
    Memo,
    Section,
    Store,
    DebugOptions
};
export { createStore };
