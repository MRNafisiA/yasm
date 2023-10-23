type Selector<
    P = any,
    S extends Record<number | string, any> = Record<number | string, any>
> = P extends undefined ? (state: any) => S : (state: any, payload: P) => S;

type Updater<P = any, S = any> = (state: S, payload: P) => S | void;

type Store<
    State,
    Selectors extends Record<string, Selector>,
    Updaters extends Record<string, Updater>
> = {
    state: { v: State };
    subscribers: Map<number, () => void>;
    selectors: Selectors;
    updaters: Updaters;
    subscribe: (callback: () => void) => () => void;
};

const createStore = <
    State,
    Selectors extends Record<string, Selector> = Record<string, never>,
    Updaters extends Record<string, Updater> = Record<string, never>
>(
    state: State,
    selectors: Selectors,
    updaters: Updaters
): Store<State, Selectors, Updaters> => {
    let id = 0;
    const subscribers = new Map<number, () => void>();

    return {
        state: { v: state },
        subscribers,
        selectors,
        updaters,
        subscribe: callback => {
            const _id = id++;
            subscribers.set(_id, callback);
            return () => {
                subscribers.delete(_id);
            };
        }
    };
};

export type { Selector, Updater, Store };
export { createStore };
