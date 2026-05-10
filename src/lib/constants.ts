// Bangladesh divisions, districts for checkout form

export const BD_DIVISIONS = [
  "Dhaka",
  "Chittagong",
  "Rajshahi",
  "Khulna",
  "Barisal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
] as const;

export const BD_DISTRICTS: Record<string, string[]> = {
  Dhaka: [
    "Dhaka",
    "Gazipur",
    "Narayanganj",
    "Tangail",
    "Munshiganj",
    "Manikganj",
    "Narsingdi",
    "Faridpur",
    "Gopalganj",
    "Madaripur",
    "Rajbari",
    "Shariatpur",
    "Kishoreganj",
  ],
  Chittagong: [
    "Chittagong",
    "Comilla",
    "Feni",
    "Brahmanbaria",
    "Rangamati",
    "Noakhali",
    "Chandpur",
    "Lakshmipur",
    "Cox's Bazar",
    "Khagrachari",
    "Bandarban",
  ],
  Rajshahi: [
    "Rajshahi",
    "Natore",
    "Nawabganj",
    "Naogaon",
    "Pabna",
    "Sirajganj",
    "Bogra",
    "Joypurhat",
  ],
  Khulna: [
    "Khulna",
    "Jessore",
    "Satkhira",
    "Bagerhat",
    "Narail",
    "Kushtia",
    "Meherpur",
    "Chuadanga",
    "Jhenaidah",
    "Magura",
  ],
  Barisal: [
    "Barisal",
    "Bhola",
    "Patuakhali",
    "Pirojpur",
    "Jhalokathi",
    "Barguna",
  ],
  Sylhet: ["Sylhet", "Maulvibazar", "Habiganj", "Sunamganj"],
  Rangpur: [
    "Rangpur",
    "Gaibandha",
    "Nilphamari",
    "Kurigram",
    "Lalmonirhat",
    "Dinajpur",
    "Thakurgaon",
    "Panchagarh",
  ],
  Mymensingh: ["Mymensingh", "Netrokona", "Jamalpur", "Sherpur"],
};

export const BD_ALL_DISTRICTS = Array.from(
  new Set(Object.values(BD_DISTRICTS).flat()),
).sort((a, b) => a.localeCompare(b));

export const BD_DISTRICT_TO_DIVISION = Object.entries(BD_DISTRICTS).reduce<
  Record<string, string>
>((acc, [division, districts]) => {
  for (const district of districts) {
    acc[district] = division;
  }
  return acc;
}, {});

export const PRODUCT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;

export const JERSEY_COLORS = [
  "Red",
  "Blue",
  "White",
  "Black",
  "Yellow",
  "Green",
  "Navy",
  "Orange",
  "Purple",
  "Pink",
  "Grey",
  "Maroon",
] as const;

export const ADMIN_ROLES = [
  { value: "admin", label: "Admin", color: "bg-blue-100 text-blue-800" },
  {
    value: "super_admin",
    label: "Super Admin",
    color: "bg-purple-100 text-purple-800",
  },
  { value: "manager", label: "Manager", color: "bg-green-100 text-green-800" },
  {
    value: "storeman",
    label: "Storeman",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "moderator",
    label: "Moderator",
    color: "bg-cyan-100 text-cyan-800",
  },
] as const;

export const ORDER_STATUSES = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "confirmed",
    label: "Confirmed",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "processing",
    label: "Processing",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "shipped",
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-800",
  },
  {
    value: "delivered",
    label: "Delivered",
    color: "bg-green-100 text-green-800",
  },
  { value: "canceled", label: "Canceled", color: "bg-red-100 text-red-800" },
  { value: "returned", label: "Returned", color: "bg-gray-100 text-gray-800" },
] as const;

export const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed Amount (৳)" },
] as const;
