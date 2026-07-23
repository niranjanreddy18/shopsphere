/**
 * Re-exports the plain react-redux hooks from a single project-local module.
 *
 * This project uses JavaScript (not TypeScript), so there's no generic
 * `RootState`/`AppDispatch` typing to wire up here — but keeping this
 * indirection anyway means every component imports hooks from
 * "app/store/hooks" rather than "react-redux" directly, so if the project
 * migrates to TypeScript later, only this one file needs to change.
 */

export { useDispatch as useAppDispatch, useSelector as useAppSelector } from "react-redux";
