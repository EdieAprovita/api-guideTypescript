import app from "./app";
import { colorTheme } from "./types/colorTheme";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(
		colorTheme.secondary.bold(
			`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
		)
	);
});
