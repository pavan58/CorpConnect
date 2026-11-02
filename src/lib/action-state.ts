export type ActionState<T = undefined> = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  data?: T;
};

export const initialState: ActionState = {};
