type Name = string;
type Path = string;

type Updater<State = any, Payload = any> = (
    state: State,
    payload: Payload
) => State | void;

type Section<State = any, Payload = any> = {
    state: State;
    updater: Updater<State, Payload>;
};

type Store<SectionMap extends Record<Name, Section> = Record<Name, Section>> = {
    state: {
        [name in keyof SectionMap]: Record<Path, SectionMap[name]['state']>;
    };
    subscribers: {
        [name in keyof SectionMap]: Record<Path, Record<number, () => void>>;
    };
    sectionMap: SectionMap;
    subscribe: (
        callback: () => void,
        name: keyof SectionMap,
        path: Path
    ) => () => void;
};

const createStore = <SectionMap extends Record<Name, Section>>(
    sectionMap: SectionMap
): Store<SectionMap> => {
    let counter = 0;
    const names: (keyof SectionMap)[] = Object.keys(sectionMap);
    const subscribers = names.reduce(
        (pre, name) => {
            pre[name] = {};
            return pre;
        },
        {} as {
            [name in keyof SectionMap]: Record<
                Path,
                Record<number, () => void>
            >;
        }
    );

    return {
        state: names.reduce(
            (pre, name) => {
                pre[name] = {};
                return pre;
            },
            {} as {
                [name in keyof SectionMap]: Record<
                    Path,
                    SectionMap[name]['state']
                >;
            }
        ),
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
                delete subscribers[name][path][id];
            };
        }
    };
};

export type { Name, Path, Updater, Section, Store };
export { createStore };
