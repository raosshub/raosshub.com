export interface Country {
  code: string;
  name: string;
  dialCode: string;
}

export const COUNTRIES: Country[] = [
  { code: "CN", name: "China", dialCode: "+86" },
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "HK", name: "Hong Kong", dialCode: "+852" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "TW", name: "Taiwan", dialCode: "+886" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "AE", name: "UAE", dialCode: "+971" },
  { code: "SA", name: "Saudi Arabia", dialCode: "+966" },
  { code: "MY", name: "Malaysia", dialCode: "+60" },
  { code: "TH", name: "Thailand", dialCode: "+66" },
  { code: "VN", name: "Vietnam", dialCode: "+84" },
  { code: "ID", name: "Indonesia", dialCode: "+62" },
  { code: "PH", name: "Philippines", dialCode: "+63" },
];

export function getDialCode(countryCode: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  return country?.dialCode || "";
}
