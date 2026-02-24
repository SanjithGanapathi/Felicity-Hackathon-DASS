export const ORGANIZER_CATEGORIES = [
	"Technology & Coding",
	"Arts & Culture",
	"Sports",
	"Music",
	"Gaming",
	"Business",
];

export const EVENT_CATEGORIES = [...ORGANIZER_CATEGORIES];

export const INTEREST_OPTIONS = [...ORGANIZER_CATEGORIES];

export const EVENT_TYPE_OPTIONS = [
	{ value: "normal", label: "Normal" },
	{ value: "merchandise", label: "Merchandise" },
];

export const ELIGIBILITY_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "iiit_only", label: "IIIT Only" },
	{ value: "non_iiit_only", label: "Non IIIT Only" },
];

export const EVENT_STATUS_OPTIONS = [
	{ value: "draft", label: "Draft" },
	{ value: "published", label: "Published" },
	{ value: "cancelled", label: "Cancelled" },
	{ value: "completed", label: "Completed" },
];

export const formatEnumLabel = (value = "") => {
	if(!value) {
		return "";
	}
	return value
		.split("_")
		.map((token) => token.charAt(0).toUpperCase() + token.slice(1))
		.join(" ");
};
