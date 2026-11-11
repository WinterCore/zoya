export interface AsyncDataSuccess<T> {
  readonly type: "success";
  readonly data: T;

  // Useful when we want to keep existing data visible while loading new data
  readonly isLoading?: boolean;
}

export interface AsyncDataError {
  readonly type: "error";
  readonly message: string;
}

export interface AsyncDataLoading {
  readonly type: "loading";
}

export type AsyncData<T> =
  | AsyncDataLoading
  | AsyncDataSuccess<T>
  | AsyncDataError;

export const AsyncDataUtils = {
  loading: (): AsyncDataLoading => ({ type: "loading" }),
  loadingWithData: <T>(data: AsyncData<T>): AsyncData<T> => {
    if (data.type === "success") {
      return { type: "success", data: data.data, isLoading: true };
    }

    return { type: "loading" };
  },
  success: <T>(data: T): AsyncDataSuccess<T> => ({ type: "success", data }),
  error: (message: string): AsyncDataError => ({ type: "error", message }),
  isLoading: <T>(data: AsyncData<T>): data is AsyncDataLoading => data.type === "loading",
  isError: <T>(data: AsyncData<T>): data is AsyncDataError => data.type === "error",
  isSuccess: <T>(data: AsyncData<T>): data is AsyncDataSuccess<T> => data.type === "success",
  map: <T, U>(data: AsyncData<T>, fn: (data: T) => U): AsyncData<U> => {
    if (data.type === "success") {
      return {
        type: "success",
        data: fn(data.data),
        ...(data.isLoading && { isLoading: true }),
      };
    } else if (data.type === "error") {
      return AsyncDataUtils.error(data.message);
    } else {
      return AsyncDataUtils.loading();
    }
  },
};
