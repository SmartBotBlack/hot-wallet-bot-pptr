import { acc } from "../accounts";
import task from "./task";

void (async () => {
	await Promise.all(
		acc.map(async ({ id, proxy }) => {
			return task(id, proxy);
		}),
	);
})();
