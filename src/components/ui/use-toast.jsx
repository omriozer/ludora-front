// Inspired by react-hot-toast library
import { useState, useEffect, createContext, useContext } from "react";
import { clog } from "@/lib/utils";

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 5000; // 5 seconds - default auto-close duration

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

const addToRemoveQueue = (toastId, duration = TOAST_REMOVE_DELAY) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, duration);

  toastTimeouts.set(toastId, timeout);
};

const clearFromRemoveQueue = (toastId) => {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    toastTimeouts.delete(toastId);
  }
};

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      // Auto-close the toast after the specified duration
      const duration = action.toast.duration || TOAST_REMOVE_DELAY;
      setTimeout(() => {
        dispatch({ type: actionTypes.REMOVE_TOAST, toastId: action.toast.id });
      }, duration);

      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ position = 'bottom-right', variant = 'default', duration, ...props }) {
  // Check for duplicate toasts based on title and description
  const isDuplicate = memoryState.toasts.some(existingToast =>
    existingToast.title === props.title &&
    existingToast.description === props.description &&
    existingToast.variant === variant
  );

  if (isDuplicate) {
    clog('Duplicate toast prevented:', props.title);

    // Find the existing toast and return its methods
    const existingToast = memoryState.toasts.find(t =>
      t.title === props.title &&
      t.description === props.description &&
      t.variant === variant
    );

    return {
      id: existingToast.id,
      dismiss: () => dispatch({ type: actionTypes.REMOVE_TOAST, toastId: existingToast.id }),
      update: (newProps) => dispatch({ type: actionTypes.UPDATE_TOAST, toast: { ...newProps, id: existingToast.id } }),
    };
  }

  const id = genId();

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      position,
      variant,
      duration,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId) => dispatch({ type: actionTypes.REMOVE_TOAST, toastId }),
  };
}

export { useToast, toast }; 