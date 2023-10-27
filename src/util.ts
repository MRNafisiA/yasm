import { Section } from './createStore';

type UpdatingKeyAndValue<T extends Record<string, unknown>> = {
    [key in keyof T]: {
        key: key;
        value: T[key];
    };
}[keyof T];

const simpleUpdaterGenerator =
    <S extends Record<string, unknown>>() =>
    (state: S, { key, value }: UpdatingKeyAndValue<S>) => ({
        ...state,
        [key]: value
    });

type SectionArrayState<S> = {
    order: number[];
    map: Record<number, S>;
};
type SectionArray<S, P> = Section<
    SectionArrayState<S>,
    {
        order?: number[];
        addingItems?: { id: number; partialState: Partial<S> }[];
        editingItems?: { id: number; itemPayload: P }[];
        removingIDs?: number[];
    }
>;

const sectionArrayGenerator = <S, P>(
    baseSection: Section<S, P>
): SectionArray<S, P> => ({
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
                baseSection.updater(state.map[id], itemPayload);
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
    }
});

export {
    type UpdatingKeyAndValue,
    type SectionArrayState,
    simpleUpdaterGenerator,
    sectionArrayGenerator
};
