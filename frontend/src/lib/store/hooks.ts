import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";

// Use these typed hooks everywhere instead of the raw useDispatch/useSelector.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
