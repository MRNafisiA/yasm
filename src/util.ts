import { produce } from 'immer';
import { Name, Section, Updater } from './createStore';

// updaters
type UpdatingKeyAndValue<T extends Record<string, unknown>> = {
    [key in keyof T]: {
        key: key;
        value: T[key];
    };
}[keyof T];

const propertyUpdaterGenerator =
    <S extends Record<string, unknown>>() =>
    (state: S, { key, value }: UpdatingKeyAndValue<S>) => ({
        ...state,
        [key]: value
    });

const mergeUpdaterGenerator =
    <S extends Record<string, unknown>>() =>
    (state: S, payload: Partial<S>) => ({
        ...state,
        ...payload
    });

// Array composition
type ArraySection<S, P> = Section<
    {
        order: number[];
        map: Record<number, S>;
    },
    {
        order?: number[];
        addingItems?: { id: number; partialState?: Partial<S> }[];
        editingItems?: { id: number; itemPayload: P }[];
        removingIDs?: number[];
    }
>;

const extractArrayIndexAndRemainedPathQuery = (
    pathQuery: string
): [index: number, remainedPathQuery: string] | string => {
    if (pathQuery[0] === '[') {
        const closeBracketLastIndex = pathQuery.indexOf(']');
        if (closeBracketLastIndex !== -1) {
            const index = Number(pathQuery.slice(1, closeBracketLastIndex));
            if (!Number.isNaN(index)) {
                return [index, pathQuery.slice(closeBracketLastIndex + 1)];
            }
        }
    }
    return 'invalid ArraySection path!';
};

const arraySectionGenerator = <S, P>(
    sectionName: Name,
    baseSection: Section<S, P>
): ArraySection<S, P> => ({
    state: { order: [], map: {} },
    updater: (state, { order, addingItems, editingItems, removingIDs }) => {
        if (order !== undefined) {
            state.order = order;
        }
        if (removingIDs !== undefined) {
            for (const removingID of removingIDs) {
                delete state.map[removingID];
            }
        }
        if (editingItems !== undefined) {
            for (const { id, itemPayload } of editingItems) {
                const newValue = baseSection.updater(
                    state.map[id],
                    itemPayload
                );
                if (newValue !== undefined) {
                    state.map[id] = newValue;
                }
            }
        }
        if (addingItems !== undefined) {
            for (const { id, partialState } of addingItems) {
                state.map[id] = {
                    ...baseSection.state,
                    ...partialState
                };
            }
        }
    },
    routing: {
        [sectionName]: {
            selectByPathQuery: (state, pathQuery) => {
                const indexAndRemainedPathQuery =
                    extractArrayIndexAndRemainedPathQuery(pathQuery);
                if (typeof indexAndRemainedPathQuery === 'string') {
                    throw `error: ${indexAndRemainedPathQuery} ArraySection of ${sectionName}, pathQuery: ${pathQuery}`;
                }
                const [index, remainedPathQuery] = indexAndRemainedPathQuery;
                const subState = state.map[index];
                if (subState === undefined) {
                    throw 'This path is referring to a element that did not initialized.';
                }
                return [subState, remainedPathQuery];
            },
            updateByPathQuery: (state, pathQuery, getNewState) => {
                const indexAndRemainedPathQuery =
                    extractArrayIndexAndRemainedPathQuery(pathQuery);
                if (typeof indexAndRemainedPathQuery === 'string') {
                    throw `error: ${indexAndRemainedPathQuery} ArraySection of ${sectionName}, pathQuery: ${pathQuery}`;
                }
                const [index, remainedPathQuery] = indexAndRemainedPathQuery;
                const subState = state.map[index];
                if (subState === undefined) {
                    throw 'This path is referring to a element that did not initialized.';
                }
                return {
                    order: state.order,
                    map: {
                        ...state.map,
                        [index]: getNewState(subState, remainedPathQuery)
                    }
                };
            }
        }
    }
});

// Object composition
type SectionWithName = { name: Name; state: any; updater: Updater };
type ObjectSectionState<SM extends Record<string, SectionWithName>> = {
    [key in keyof SM]: SM[key]['state'];
};
type ObjectSection<SM extends Record<string, SectionWithName>> = Section<
    ObjectSectionState<SM>,
    { [key in keyof SM]?: Parameters<SM[key]['updater']>[1] }
>;

const extractObjectIndexAndRemainedPathQuery = (
    pathQuery: string
): [index: string, remainedPathQuery: string] | string => {
    if (pathQuery[0] === '[') {
        const closeBracketLastIndex = pathQuery.indexOf(']');
        if (closeBracketLastIndex !== -1) {
            const index = pathQuery.slice(1, closeBracketLastIndex);
            return [index, pathQuery.slice(closeBracketLastIndex + 1)];
        }
    }
    return 'invalid ObjectSection path!';
};

const objectSectionGenerator = <SM extends Record<string, SectionWithName>>(
    sectionMap: SM
): ObjectSection<SM> => ({
    state: Object.fromEntries(
        Object.entries(sectionMap).map(([key, { state }]) => [key, state])
    ) as ObjectSectionState<SM>,
    updater: (state, payload) => {
        for (const key in payload) {
            state[key] = produce(state[key], (draft: any) =>
                sectionMap[key].updater(draft, payload[key])
            );
        }
    },
    routing: Object.fromEntries(
        Object.entries(sectionMap).map(([, { name }]) => [
            name,
            {
                selectByPathQuery: (state, pathQuery) => {
                    const indexAndRemainedPathQuery =
                        extractObjectIndexAndRemainedPathQuery(pathQuery);
                    if (typeof indexAndRemainedPathQuery === 'string') {
                        throw `error: ${indexAndRemainedPathQuery} ObjectSection of ${name}. pathQuery: ${pathQuery}`;
                    }
                    const [index, remainedPathQuery] =
                        indexAndRemainedPathQuery;
                    const subState = state[index];
                    if (subState === undefined) {
                        throw 'This path is referring to a key that did not initialized.';
                    }
                    return [subState, remainedPathQuery];
                },
                updateByPathQuery: (state, pathQuery, getNewState) => {
                    const indexAndRemainedPathQuery =
                        extractObjectIndexAndRemainedPathQuery(pathQuery);
                    if (typeof indexAndRemainedPathQuery === 'string') {
                        throw `error: ${indexAndRemainedPathQuery} ObjectSection of ${name}. pathQuery: ${pathQuery}`;
                    }
                    const [index, remainedPathQuery] =
                        indexAndRemainedPathQuery;
                    const subState = state[index];
                    if (subState === undefined) {
                        throw 'This path is referring to a key that did not initialized.';
                    }
                    return {
                        ...state,
                        [index]: getNewState(subState, remainedPathQuery)
                    };
                }
            }
        ])
    )
});

export {
    type UpdatingKeyAndValue,
    propertyUpdaterGenerator,
    mergeUpdaterGenerator
};
export {
    type ArraySection,
    extractArrayIndexAndRemainedPathQuery,
    arraySectionGenerator
};
export {
    type SectionWithName,
    type ObjectSectionState,
    type ObjectSection,
    extractObjectIndexAndRemainedPathQuery,
    objectSectionGenerator
};
