"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  Users, UserPlus, Trash2, Edit, X, Loader2, AlertCircle, Search, Mail, Phone,
  Building2, Briefcase, MapPin, CreditCard, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * A reference the API returns populated on list responses and as a bare id on
 * others. The form needs the id, the table needs the name, so both forms are
 * spelled out and read through the helpers below.
 */
type Ref = { _id: string; name: string } | string | null | undefined;

/** One entry from the public Indonesian region API. */
type Region = { id: string; name: string };

/** Id of a reference in either form. */
function refId(ref: Ref): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref._id;
}

/** Name of a reference, empty when the API returned only an id. */
function refName(ref: Ref): string {
  return typeof ref === "object" && ref !== null ? ref.name : "";
}

interface SearchSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
}

function SearchSelect({ label, value, onChange, options, placeholder = "Pilih...", disabled = false }: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", clickOutside);
    return () => document.removeEventListener("mousedown", clickOutside);
  }, []);

  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOpt = options.find(opt => opt.value === value);

  return (
    <div className="space-y-1 relative w-full" ref={dropdownRef}>
      <label className="font-semibold text-foreground block mb-1 text-[11px]">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary text-left min-h-[34px] disabled:opacity-50 cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span className="text-[11px] text-subtle">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line rounded-lg shadow-[var(--shadow-pop)] p-1.5 space-y-1.5 max-h-56 overflow-hidden flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full px-2.5 py-1.5 rounded bg-surface-2 border border-line text-xs text-foreground dark:text-foreground focus:outline-none placeholder:text-subtle"
          />
          <div className="space-y-0.5 overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <div className="p-2 text-subtle text-center text-[11px]">Tidak ditemukan</div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-all cursor-pointer ${
                    opt.value === value 
                      ? "bg-primary text-primary-foreground font-semibold" 
                      : "hover:bg-surface-2 text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface Branch { _id: string; name: string; }
interface Division { _id: string; name: string; }
interface Position { _id: string; name: string; }
interface Role { _id: string; name: string; }

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  nik: string;
  personalEmail: string;
  officeEmail: string;
  phone: string;
  birthPlace: string;
  birthDate: string | Date;
  gender: "male" | "female";
  religion: string;
  maritalStatus: string;
  ktpAddress: { street: string; subdistrict: string; city: string; province: string; country?: string; };
  domicileAddress: { street: string; subdistrict: string; city: string; province: string; country?: string; };
  npwp: string;
  taxStatus: string;
  bpjsKesehatan?: string;
  bpjsKetenagakerjaan?: string;
  bankAccount: { bankName: string; accountNumber: string; accountHolder: string; };
  branchId: Ref;
  divisionId: Ref;
  positionId: Ref;
  supervisorId?: Ref;
  storeManagerId?: Ref;
  areaManagerId?: Ref;
  joinDate: string | Date;
  employmentStatus: "probation" | "pkwt" | "pkwtt" | "outsource";
  status: "active" | "onboarding" | "suspended" | "resigned";
}

/**
 * Region lists come through our own API rather than straight from the upstream
 * service, so the browser never talks to a third-party host and the CSP stays
 * at connect-src 'self'. Failures resolve to an empty list: a missing dropdown
 * is better than a form that refuses to open.
 */
async function loadRegions(
  level: "provinces" | "regencies" | "districts",
  parent?: string
): Promise<Region[]> {
  const qs = parent ? `?level=${level}&parent=${encodeURIComponent(parent)}` : `?level=${level}`;
  try {
    const res = await fetch(`/api/v1/regions${qs}`);
    const data = await res.json();
    return data.success ? (data.data as Region[]) : [];
  } catch {
    return [];
  }
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form inputs
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [personalEmail, setPersonalEmail] = useState("");
  const [officeEmail, setOfficeEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [religion, setReligion] = useState("Islam");
  const [maritalStatus, setMaritalStatus] = useState("Belum Kawin");
  const [ktpStreet, setKtpStreet] = useState("");
  const [ktpSubdistrict, setKtpSubdistrict] = useState("");
  const [ktpCity, setKtpCity] = useState("");
  const [ktpProvince, setKtpProvince] = useState("");
  const [domicileStreet, setDomicileStreet] = useState("");
  const [domicileSubdistrict, setDomicileSubdistrict] = useState("");
  const [domicileCity, setDomicileCity] = useState("");
  const [domicileProvince, setDomicileProvince] = useState("");
  const [npwp, setNpwp] = useState("");
  const [taxStatus, setTaxStatus] = useState("TK/0");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [branchId, setBranchId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [storeManagerId, setStoreManagerId] = useState("");
  const [areaManagerId, setAreaManagerId] = useState("");
  const [roleId, setRoleId] = useState(""); // select login user role
  const [password, setPassword] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState<"probation" | "pkwt" | "pkwtt" | "outsource">("probation");
  const [status, setStatus] = useState<"active" | "onboarding" | "suspended" | "resigned">("onboarding");

  // Indonesian Region API States
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [ktpCities, setKtpCities] = useState<{ id: string; name: string }[]>([]);
  const [ktpDistricts, setKtpDistricts] = useState<{ id: string; name: string }[]>([]);
  const [domicileCities, setDomicileCities] = useState<{ id: string; name: string }[]>([]);
  const [domicileDistricts, setDomicileDistricts] = useState<{ id: string; name: string }[]>([]);

  // Selected region IDs
  const [selectedKtpProvinceId, setSelectedKtpProvinceId] = useState("");
  const [selectedKtpCityId, setSelectedKtpCityId] = useState("");
  const [selectedDomicileProvinceId, setSelectedDomicileProvinceId] = useState("");
  const [selectedDomicileCityId, setSelectedDomicileCityId] = useState("");
  const [ktpCountry, setKtpCountry] = useState("Indonesia");
  const [domicileCountry, setDomicileCountry] = useState("Indonesia");

  // Load provinces on mount
  useEffect(() => {
    void loadRegions("provinces").then(setProvinces);
  }, []);

  // Fetch cities for KTP
  useEffect(() => {
    if (!selectedKtpProvinceId) {
      setKtpCities([]);
      return;
    }
    void loadRegions("regencies", selectedKtpProvinceId).then(setKtpCities);
  }, [selectedKtpProvinceId]);

  // Fetch districts for KTP
  useEffect(() => {
    if (!selectedKtpCityId) {
      setKtpDistricts([]);
      return;
    }
    void loadRegions("districts", selectedKtpCityId).then(setKtpDistricts);
  }, [selectedKtpCityId]);

  // Fetch cities for Domicile
  useEffect(() => {
    if (!selectedDomicileProvinceId) {
      setDomicileCities([]);
      return;
    }
    void loadRegions("regencies", selectedDomicileProvinceId).then(setDomicileCities);
  }, [selectedDomicileProvinceId]);

  // Fetch districts for Domicile
  useEffect(() => {
    if (!selectedDomicileCityId) {
      setDomicileDistricts([]);
      return;
    }
    void loadRegions("districts", selectedDomicileCityId).then(setDomicileDistricts);
  }, [selectedDomicileCityId]);

  // Find matching IDs when form is opened with an employee
  useEffect(() => {
    if (formOpen && selectedId && provinces.length > 0) {
      const ktpProv = provinces.find(p => p.name.toLowerCase() === ktpProvince.toLowerCase());
      if (ktpProv) {
        setSelectedKtpProvinceId(ktpProv.id);
        void loadRegions("regencies", ktpProv.id).then((cities) => {
          setKtpCities(cities);
          const ktpC = cities.find((c) => c.name.toLowerCase() === ktpCity.toLowerCase());
          if (!ktpC) return;
          setSelectedKtpCityId(ktpC.id);
          void loadRegions("districts", ktpC.id).then(setKtpDistricts);
        });
      }

      const domProv = provinces.find(p => p.name.toLowerCase() === domicileProvince.toLowerCase());
      if (domProv) {
        setSelectedDomicileProvinceId(domProv.id);
        void loadRegions("regencies", domProv.id).then((cities) => {
          setDomicileCities(cities);
          const domC = cities.find((c) => c.name.toLowerCase() === domicileCity.toLowerCase());
          if (!domC) return;
          setSelectedDomicileCityId(domC.id);
          void loadRegions("districts", domC.id).then(setDomicileDistricts);
        });
      }
    }
  }, [formOpen, selectedId, provinces]);

  const fetchMetadata = useCallback(async () => {
    try {
      const [rBranch, rDiv, rPos, rRole] = await Promise.all([
        fetch("/api/v1/branches"),
        fetch("/api/v1/divisions"),
        fetch("/api/v1/positions"),
        fetch("/api/v1/roles"),
      ]);
      const [dBranch, dDiv, dPos, dRole] = await Promise.all([
        rBranch.json(),
        rDiv.json(),
        rPos.json(),
        rRole.json(),
      ]);
      if (dBranch.success) setBranches(dBranch.data);
      if (dDiv.success) setDivisions(dDiv.data);
      if (dPos.success) setPositions(dPos.data);
      // /api/v1/roles now returns { roles, modules, actions, scopes } so the
      // Settings screen can render the permission matrix from the same call.
      if (dRole.success) setRoles(dRole.data.roles ?? dRole.data);
    } catch (err) {
      console.error("Gagal memuat meta:", err);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data);
      }
    } catch (err) {
      console.error("Gagal memuat karyawan:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetadata();
    void fetchEmployees();
  }, [fetchMetadata, fetchEmployees]);

  const handleOpenForm = (emp?: Employee) => {
    if (emp) {
      setSelectedId(emp._id || null);
      setName(emp.name);
      setNik(emp.nik || "");
      setPersonalEmail(emp.personalEmail);
      setOfficeEmail(emp.officeEmail);
      setPhone(emp.phone);
      setBirthPlace(emp.birthPlace);
      setBirthDate(emp.birthDate ? new Date(emp.birthDate).toISOString().split("T")[0] : "");
      setGender(emp.gender);
      setReligion(emp.religion);
      setMaritalStatus(emp.maritalStatus);
      setKtpStreet(emp.ktpAddress.street);
      setKtpSubdistrict(emp.ktpAddress.subdistrict);
      setKtpCity(emp.ktpAddress.city);
      setKtpProvince(emp.ktpAddress.province);
      setKtpCountry(emp.ktpAddress.country || "Indonesia");
      setDomicileStreet(emp.domicileAddress.street);
      setDomicileSubdistrict(emp.domicileAddress.subdistrict);
      setDomicileCity(emp.domicileAddress.city);
      setDomicileProvince(emp.domicileAddress.province);
      setDomicileCountry(emp.domicileAddress.country || "Indonesia");
      setNpwp(emp.npwp || "");
      setTaxStatus(emp.taxStatus);
      setBankName(emp.bankAccount.bankName);
      setBankAccountNumber(emp.bankAccount.accountNumber || "");
      setBankAccountHolder(emp.bankAccount.accountHolder);
      setBranchId(refId(emp.branchId));
      setDivisionId(refId(emp.divisionId));
      setPositionId(refId(emp.positionId));
      setSupervisorId(refId(emp.supervisorId));
      setStoreManagerId(refId(emp.storeManagerId));
      setAreaManagerId(refId(emp.areaManagerId));
      setJoinDate(emp.joinDate ? new Date(emp.joinDate).toISOString().split("T")[0] : "");
      setEmploymentStatus(emp.employmentStatus);
      setStatus(emp.status);
      setRoleId(""); // roleId is only for creation or managed via users settings
      setPassword("");
    } else {
      setSelectedId(null);
      setName("");
      setNik("");
      setPersonalEmail("");
      setOfficeEmail("");
      setPhone("");
      setBirthPlace("");
      setBirthDate("");
      setGender("male");
      setReligion("Islam");
      setMaritalStatus("Belum Kawin");
      setKtpStreet("");
      setKtpSubdistrict("");
      setKtpCity("");
      setKtpProvince("");
      setKtpCountry("Indonesia");
      setDomicileStreet("");
      setDomicileSubdistrict("");
      setDomicileCity("");
      setDomicileProvince("");
      setDomicileCountry("Indonesia");
      setSelectedKtpProvinceId("");
      setSelectedKtpCityId("");
      setSelectedDomicileProvinceId("");
      setSelectedDomicileCityId("");
      setNpwp("");
      setTaxStatus("TK/0");
      setBankName("");
      setBankAccountNumber("");
      setBankAccountHolder("");
      setBranchId(branches[0]?._id || "");
      setDivisionId(divisions[0]?._id || "");
      setPositionId(positions[0]?._id || "");
      setSupervisorId("");
      setStoreManagerId("");
      setAreaManagerId("");
      setJoinDate(new Date().toISOString().split("T")[0]);
      setEmploymentStatus("probation");
      setStatus("onboarding");
      setRoleId(roles.find(r => r.name === "STAFF")?._id || "");
      setPassword("");
    }
    setErrorMessage("");
    setFormOpen(true);
  };

  const handleCloseForm = () => setFormOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedId,
          name,
          nik,
          personalEmail,
          officeEmail,
          phone,
          birthPlace,
          birthDate,
          gender,
          religion,
          maritalStatus,
          ktpAddress: { street: ktpStreet, subdistrict: ktpSubdistrict, city: ktpCity, province: ktpProvince, country: ktpCountry },
          domicileAddress: { street: domicileStreet, subdistrict: domicileSubdistrict, city: domicileCity, province: domicileProvince, country: domicileCountry },
          npwp,
          taxStatus,
          bankAccount: { bankName, accountNumber: bankAccountNumber, accountHolder: bankAccountHolder },
          branchId,
          divisionId,
          positionId,
          supervisorId: supervisorId || null,
          storeManagerId: storeManagerId || null,
          areaManagerId: areaManagerId || null,
          joinDate,
          employmentStatus,
          status,
          roleId: selectedId ? undefined : roleId,
          password: password || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchEmployees();
        setFormOpen(false);
      } else {
        setErrorMessage(data.error?.message || "Gagal menyimpan data karyawan");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan koneksi server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data karyawan ini? Seluruh login terkait akan dihapus.")) return;

    try {
      const response = await fetch(`/api/v1/employees/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        fetchEmployees();
      }
    } catch (err) {
      console.error("Gagal menghapus karyawan:", err);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.officeEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const supervisorOptions = employees
    .filter(emp => emp._id !== selectedId)
    .map(emp => ({ label: `${emp.name} (${emp.employeeId})`, value: emp._id || "" }));

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground dark:text-foreground">Manajemen Karyawan</h1>
          <p className="text-xs text-muted mt-1">Registrasi karyawan, perbarui biodata, penempatan jabatan, dan info rekening bank</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-sm font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 active:scale-[0.98] transition-all w-fit"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Karyawan
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama, NIP, email..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-surface border border-line text-xs text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-muted"
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted dark:text-muted">
          <Loader2 className="w-8 h-8 animate-spin text-foreground" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="h-48 border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 text-muted">
          <Users className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Karyawan tidak ditemukan</p>
          <p className="text-xs mt-1">Silakan sesuaikan filter pencarian atau buat registrasi karyawan baru.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line/60 dark:border-white/6 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-line bg-surface text-muted dark:text-muted">
                <th className="p-4 font-semibold">NIP / Karyawan</th>
                <th className="p-4 font-semibold">Kontak</th>
                <th className="p-4 font-semibold">Penempatan</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Join Date</th>
                <th className="p-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp._id} className="border-b border-line hover:bg-white/1 transition-all">
                  <td className="p-4">
                    <div>
                      <span className="font-mono text-xs text-muted block">{emp.employeeId}</span>
                      <span className="font-semibold text-foreground dark:text-foreground text-sm">{emp.name}</span>
                    </div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-muted dark:text-muted">
                      <Mail className="w-3.5 h-3.5 text-muted" />
                      <span>{emp.officeEmail}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted dark:text-muted">
                      <Phone className="w-3.5 h-3.5 text-muted" />
                      <span>{emp.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-muted" />
                      <span>{refName(emp.branchId) || "Tanpa cabang"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted dark:text-muted">
                      <Briefcase className="w-3.5 h-3.5 text-muted" />
                      <span>{refName(emp.divisionId) || "Tanpa divisi"} &middot; {refName(emp.positionId) || "Tanpa jabatan"}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                      emp.status === "active"
                        ? "bg-success-soft text-success dark:text-success border-success/20"
                        : emp.status === "onboarding"
                        ? "bg-surface-2 text-foreground dark:text-muted border-line"
                        : "bg-danger-soft text-danger dark:text-danger border-danger/20"
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted dark:text-muted">
                    {new Date(emp.joinDate).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-1 mt-1.5">
                    <button
                      onClick={() => handleOpenForm(emp)}
                      className="p-1.5 rounded hover:bg-white/4 text-muted dark:text-muted hover:text-foreground transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp._id!)}
                      className="p-1.5 rounded hover:bg-danger-soft text-muted dark:text-muted hover:text-danger transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Form Panel */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseForm}
              className="absolute inset-0 bg-black"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl h-full bg-surface border-l border-line shadow-[var(--shadow-pop)] relative z-10 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h2 className="text-base font-semibold text-foreground dark:text-foreground">
                    {selectedId ? "Edit Profil Karyawan" : "Registrasi Karyawan Baru"}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 rounded bg-surface border border-line text-muted dark:text-muted hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-danger-soft border border-danger/20 text-danger text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form id="employee-form" onSubmit={handleSubmit} className="space-y-6 text-xs text-foreground">
                  {/* Bagian 1: Data Diri */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                      <Users className="w-4 h-4" /> Data Diri Karyawan
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Nama Lengkap (Sesuai KTP)</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Nomor NIK KTP (Enkripsi)</label>
                        <input type="text" required value={nik} onChange={e => setNik(e.target.value)} placeholder="16 digit NIK" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Tempat Lahir</label>
                        <input type="text" required value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="e.g. Jakarta" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Tanggal Lahir</label>
                        <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value as "male" | "female")} className="w-full px-3 py-2 rounded-lg bg-surface-2 dark:bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs">
                          <option value="male">Laki-Laki</option>
                          <option value="female">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Agama</label>
                        <input type="text" required value={religion} onChange={e => setReligion(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Pernikahan</label>
                        <input type="text" required value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Kontak */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                      <Phone className="w-4 h-4" /> Kontak & Akun
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">No. HP / WhatsApp</label>
                        <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxx" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Email Pribadi</label>
                        <input type="email" required value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="john@gmail.com" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-1">
                        <label className="font-semibold">Email Kantor (Email Login)</label>
                        <input type="email" required value={officeEmail} onChange={e => setOfficeEmail(e.target.value)} placeholder="john@perusahaan.com" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold flex items-center justify-between">
                          <span>{selectedId ? "Kata Sandi Baru" : "Kata Sandi Akun"}</span>
                          <span className="text-xs text-muted dark:text-subtle font-normal">
                            {selectedId ? "(Kosongkan jika tidak diubah)" : "(Kosongkan untuk default)"}
                          </span>
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder={selectedId ? "Ubah kata sandi..." : "Tentukan kata sandi login..."}
                          className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Alamat */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                      <MapPin className="w-4 h-4" /> Alamat Lengkap
                    </h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-surface-2 rounded-[var(--radius)] border border-line space-y-3">
                        <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-b border-line pb-1">Alamat Sesuai KTP</span>
                        <div className="space-y-1">
                          <label className="font-semibold block text-[11px] mb-1 text-foreground dark:text-muted">Jalan / RT / RW</label>
                          <input type="text" required value={ktpStreet} onChange={e => setKtpStreet(e.target.value)} placeholder="Nama Jalan, No. Rumah, RT/RW" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <SearchSelect
                            label="Provinsi"
                            value={ktpProvince}
                            onChange={(val) => {
                              setKtpProvince(val);
                              const prov = provinces.find(p => p.name === val);
                              if (prov) {
                                setSelectedKtpProvinceId(prov.id);
                                setKtpCity("");
                                setSelectedKtpCityId("");
                                setKtpSubdistrict("");
                              }
                            }}
                            options={provinces.map(p => ({ label: p.name, value: p.name }))}
                            placeholder="Pilih Provinsi..."
                          />
                          <SearchSelect
                            label="Kota / Kabupaten"
                            value={ktpCity}
                            disabled={!selectedKtpProvinceId}
                            onChange={(val) => {
                              setKtpCity(val);
                              const reg = ktpCities.find(c => c.name === val);
                              if (reg) {
                                setSelectedKtpCityId(reg.id);
                                setKtpSubdistrict("");
                              }
                            }}
                            options={ktpCities.map(c => ({ label: c.name, value: c.name }))}
                            placeholder={selectedKtpProvinceId ? "Pilih Kota/Kab..." : "Pilih Provinsi Dulu"}
                          />
                          <SearchSelect
                            label="Kecamatan"
                            value={ktpSubdistrict}
                            disabled={!selectedKtpCityId}
                            onChange={(val) => setKtpSubdistrict(val)}
                            options={ktpDistricts.map(d => ({ label: d.name, value: d.name }))}
                            placeholder={selectedKtpCityId ? "Pilih Kecamatan..." : "Pilih Kota Dulu"}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-surface-2 rounded-[var(--radius)] border border-line space-y-3">
                        <span className="font-semibold text-foreground text-xs uppercase tracking-wider block border-b border-line pb-1">Alamat Domisili Aktif</span>
                        <div className="space-y-1">
                          <label className="font-semibold block text-[11px] mb-1 text-foreground dark:text-muted">Jalan / RT / RW</label>
                          <input type="text" required value={domicileStreet} onChange={e => setDomicileStreet(e.target.value)} placeholder="Nama Jalan, No. Rumah, RT/RW" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <SearchSelect
                            label="Provinsi"
                            value={domicileProvince}
                            onChange={(val) => {
                              setDomicileProvince(val);
                              const prov = provinces.find(p => p.name === val);
                              if (prov) {
                                setSelectedDomicileProvinceId(prov.id);
                                setDomicileCity("");
                                setSelectedDomicileCityId("");
                                setDomicileSubdistrict("");
                              }
                            }}
                            options={provinces.map(p => ({ label: p.name, value: p.name }))}
                            placeholder="Pilih Provinsi..."
                          />
                          <SearchSelect
                            label="Kota / Kabupaten"
                            value={domicileCity}
                            disabled={!selectedDomicileProvinceId}
                            onChange={(val) => {
                              setDomicileCity(val);
                              const reg = domicileCities.find(c => c.name === val);
                              if (reg) {
                                setSelectedDomicileCityId(reg.id);
                                setDomicileSubdistrict("");
                              }
                            }}
                            options={domicileCities.map(c => ({ label: c.name, value: c.name }))}
                            placeholder={selectedDomicileProvinceId ? "Pilih Kota/Kab..." : "Pilih Provinsi Dulu"}
                          />
                          <SearchSelect
                            label="Kecamatan"
                            value={domicileSubdistrict}
                            disabled={!selectedDomicileCityId}
                            onChange={(val) => setDomicileSubdistrict(val)}
                            options={domicileDistricts.map(d => ({ label: d.name, value: d.name }))}
                            placeholder={selectedDomicileCityId ? "Pilih Kecamatan..." : "Pilih Kota Dulu"}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian 4: Finansial */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                      <CreditCard className="w-4 h-4" /> Akun Keuangan & Rekening Bank
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">NPWP (Enkripsi)</label>
                        <input type="text" required value={npwp} onChange={e => setNpwp(e.target.value)} placeholder="No. NPWP" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Pajak</label>
                        <input type="text" required value={taxStatus} onChange={e => setTaxStatus(e.target.value)} placeholder="TK/0, K/0, K/1" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Nama Bank</label>
                        <input type="text" required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Bank Mandiri" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">No Rekening (Enkripsi)</label>
                        <input type="text" required value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="No Rekening" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Atas Nama</label>
                        <input type="text" required value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} placeholder="Sesuai buku tabungan" className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 5: Penempatan */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-line">
                      <Briefcase className="w-4 h-4" /> Penempatan Kerja & Jabatan
                    </h3>
                    <div className="grid grid-cols-3 gap-4 items-end">
                      <SearchSelect
                        label="Cabang Kantor"
                        value={branchId}
                        onChange={setBranchId}
                        options={branches.map(b => ({ label: b.name, value: b._id }))}
                        placeholder="Pilih Cabang..."
                      />
                      <SearchSelect
                        label="Divisi"
                        value={divisionId}
                        onChange={setDivisionId}
                        options={divisions.map(d => ({ label: d.name, value: d._id }))}
                        placeholder="Pilih Divisi..."
                      />
                      <SearchSelect
                        label="Jabatan"
                        value={positionId}
                        onChange={setPositionId}
                        options={positions.map(p => ({ label: p.name, value: p._id }))}
                        placeholder="Pilih Jabatan..."
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <SearchSelect
                        label="Supervisor (SPV) Langsung"
                        value={supervisorId}
                        onChange={(val) => setSupervisorId(val)}
                        options={supervisorOptions}
                        placeholder="Pilih SPV (Opsional)..."
                      />
                      <SearchSelect
                        label="Store Manager (SM) Atasan"
                        value={storeManagerId}
                        onChange={(val) => setStoreManagerId(val)}
                        options={supervisorOptions}
                        placeholder="Pilih SM (Opsional)..."
                      />
                      <SearchSelect
                        label="Area Manager (AM) Regional"
                        value={areaManagerId}
                        onChange={(val) => setAreaManagerId(val)}
                        options={supervisorOptions}
                        placeholder="Pilih AM (Opsional)..."
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Tanggal Mulai Kerja (Join Date)</label>
                        <input type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Kepegawaian</label>
                        <select value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value as "probation" | "pkwt" | "pkwtt" | "outsource")} className="w-full px-3 py-2 rounded-lg bg-surface-2 dark:bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs">
                          <option value="probation">Probation</option>
                          <option value="pkwt">PKWT</option>
                          <option value="pkwtt">PKWTT</option>
                          <option value="outsource">Outsource</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Aktivitas Karyawan</label>
                        <select value={status} onChange={e => setStatus(e.target.value as "active" | "onboarding" | "suspended" | "resigned")} className="w-full px-3 py-2 rounded-lg bg-surface-2 dark:bg-surface border border-line text-foreground dark:text-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-all text-xs">
                          <option value="onboarding">Onboarding</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="resigned">Resigned</option>
                        </select>
                      </div>
                    </div>

                    {!selectedId && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-semibold text-muted dark:text-muted uppercase tracking-wider mt-4 flex items-center gap-1.5 pb-1 border-b border-line">
                          <ShieldCheck className="w-4 h-4" /> Kredensial Login
                        </h4>
                        <div className="space-y-1 mt-2">
                          <SearchSelect
                            label="Role Akun Pengguna"
                            value={roleId}
                            onChange={setRoleId}
                            options={[
                              { label: "(Tanpa Akun Login)", value: "" },
                              ...roles.map(r => ({ label: r.name, value: r._id }))
                            ]}
                            placeholder="Pilih Role..."
                          />
                          <p className="text-xs text-muted italic mt-1">
                            * Karyawan yang diberi role akan dibuatkan akun login otomatis dengan email kantor dan default password: <span className="font-mono text-muted dark:text-muted">password123</span>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="border-t border-line pt-4 mt-6 flex items-center justify-end gap-3 bg-surface relative z-20">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-muted dark:text-muted hover:text-foreground hover:bg-surface cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="employee-form"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground border border-line text-xs font-semibold cursor-pointer hover:bg-surface-2 dark:hover:bg-surface-2 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Karyawan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
