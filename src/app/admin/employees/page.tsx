"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Users, UserPlus, Trash2, Edit, X, Loader2, AlertCircle, Search, Mail, Phone,
  Building2, Briefcase, MapPin, CreditCard, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-[11px]">{label}</label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-left min-h-[34px] disabled:opacity-50 cursor-pointer"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span className="text-[9px] text-slate-400">▼</span>
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-[#0a0c14] border border-slate-200 dark:border-white/8 rounded-lg shadow-xl p-1.5 space-y-1.5 max-h-56 overflow-hidden flex flex-col">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari..."
            className="w-full px-2.5 py-1.5 rounded bg-slate-50 dark:bg-white/3 border border-slate-200 dark:border-white/8 text-xs text-slate-900 dark:text-slate-200 focus:outline-none placeholder:text-slate-400"
          />
          <div className="space-y-0.5 overflow-y-auto max-h-40">
            {filtered.length === 0 ? (
              <div className="p-2 text-slate-400 text-center text-[10px]">Tidak ditemukan</div>
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
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold" 
                      : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
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
  branchId: any;
  divisionId: any;
  positionId: any;
  supervisorId?: any;
  storeManagerId?: any;
  areaManagerId?: any;
  joinDate: string | Date;
  employmentStatus: "probation" | "pkwt" | "pkwtt" | "outsource";
  status: "active" | "onboarding" | "suspended" | "resigned";
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
    fetch("https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json")
      .then(res => res.json())
      .then(data => setProvinces(data || []))
      .catch(err => console.error("Error load provinces:", err));
  }, []);

  // Fetch cities for KTP
  useEffect(() => {
    if (!selectedKtpProvinceId) {
      setKtpCities([]);
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedKtpProvinceId}.json`)
      .then(res => res.json())
      .then(data => setKtpCities(data || []))
      .catch(err => console.error("Error load KTP cities:", err));
  }, [selectedKtpProvinceId]);

  // Fetch districts for KTP
  useEffect(() => {
    if (!selectedKtpCityId) {
      setKtpDistricts([]);
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedKtpCityId}.json`)
      .then(res => res.json())
      .then(data => setKtpDistricts(data || []))
      .catch(err => console.error("Error load KTP districts:", err));
  }, [selectedKtpCityId]);

  // Fetch cities for Domicile
  useEffect(() => {
    if (!selectedDomicileProvinceId) {
      setDomicileCities([]);
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedDomicileProvinceId}.json`)
      .then(res => res.json())
      .then(data => setDomicileCities(data || []))
      .catch(err => console.error("Error load domicile cities:", err));
  }, [selectedDomicileProvinceId]);

  // Fetch districts for Domicile
  useEffect(() => {
    if (!selectedDomicileCityId) {
      setDomicileDistricts([]);
      return;
    }
    fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedDomicileCityId}.json`)
      .then(res => res.json())
      .then(data => setDomicileDistricts(data || []))
      .catch(err => console.error("Error load domicile districts:", err));
  }, [selectedDomicileCityId]);

  // Find matching IDs when form is opened with an employee
  useEffect(() => {
    if (formOpen && selectedId && provinces.length > 0) {
      const ktpProv = provinces.find(p => p.name.toLowerCase() === ktpProvince.toLowerCase());
      if (ktpProv) {
        setSelectedKtpProvinceId(ktpProv.id);
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${ktpProv.id}.json`)
          .then(res => res.json())
          .then(cities => {
            setKtpCities(cities || []);
            const ktpC = cities?.find((c: any) => c.name.toLowerCase() === ktpCity.toLowerCase());
            if (ktpC) {
              setSelectedKtpCityId(ktpC.id);
              fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${ktpC.id}.json`)
                .then(res => res.json())
                .then(districts => setKtpDistricts(districts || []))
                .catch(e => console.error(e));
            }
          });
      }

      const domProv = provinces.find(p => p.name.toLowerCase() === domicileProvince.toLowerCase());
      if (domProv) {
        setSelectedDomicileProvinceId(domProv.id);
        fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${domProv.id}.json`)
          .then(res => res.json())
          .then(cities => {
            setDomicileCities(cities || []);
            const domC = cities?.find((c: any) => c.name.toLowerCase() === domicileCity.toLowerCase());
            if (domC) {
              setSelectedDomicileCityId(domC.id);
              fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${domC.id}.json`)
                .then(res => res.json())
                .then(districts => setDomicileDistricts(districts || []))
                .catch(e => console.error(e));
            }
          });
      }
    }
  }, [formOpen, selectedId, provinces]);

  useEffect(() => {
    fetchMetadata();
    fetchEmployees();
  }, []);

  const fetchMetadata = async () => {
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
      if (dRole.success) setRoles(dRole.data);
    } catch (err) {
      console.error("Gagal memuat meta:", err);
    }
  };

  const fetchEmployees = async () => {
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
  };

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
      setBranchId(emp.branchId?._id || emp.branchId || "");
      setDivisionId(emp.divisionId?._id || emp.divisionId || "");
      setPositionId(emp.positionId?._id || emp.positionId || "");
      setSupervisorId(emp.supervisorId?._id || emp.supervisorId || "");
      setStoreManagerId(emp.storeManagerId?._id || emp.storeManagerId || "");
      setAreaManagerId(emp.areaManagerId?._id || emp.areaManagerId || "");
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-white/4 pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Manajemen Karyawan</h1>
          <p className="text-xs text-slate-500 dark:text-slate-550 dark:text-slate-400 mt-1">Registrasi karyawan, perbarui biodata, penempatan jabatan, dan info rekening bank</p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-sm font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-[0.98] transition-all w-fit"
        >
          <UserPlus className="w-4 h-4" />
          Tambah Karyawan
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari nama, NIP, email..."
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-550 dark:text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800 dark:text-slate-200" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="h-48 border border-dashed border-slate-200 dark:border-white/8 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-500">
          <Users className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Karyawan tidak ditemukan</p>
          <p className="text-xs mt-1">Silakan sesuaikan filter pencarian atau buat registrasi karyawan baru.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/6 shadow-xs rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/8 bg-white dark:bg-white/2 text-slate-550 dark:text-slate-400">
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
                <tr key={emp._id} className="border-b border-slate-200 dark:border-white/4 hover:bg-white/1 transition-all">
                  <td className="p-4">
                    <div>
                      <span className="font-mono text-[10px] text-slate-500 block">{emp.employeeId}</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">{emp.name}</span>
                    </div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-600" />
                      <span>{emp.officeEmail}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-slate-600" />
                      <span>{emp.phone}</span>
                    </div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>{emp.branchId?.name || "No Branch"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-550 dark:text-slate-400">
                      <Briefcase className="w-3.5 h-3.5 text-slate-600" />
                      <span>{emp.divisionId?.name || "No Div"} - {emp.positionId?.name || "No Pos"}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      emp.status === "active"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : emp.status === "onboarding"
                        ? "bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-350 border-slate-200 dark:border-white/8"
                        : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-550 dark:text-slate-400">
                    {new Date(emp.joinDate).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-1 mt-1.5">
                    <button
                      onClick={() => handleOpenForm(emp)}
                      className="p-1.5 rounded hover:bg-white/4 text-slate-550 dark:text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp._id!)}
                      className="p-1.5 rounded hover:bg-red-500/5 text-slate-550 dark:text-slate-400 hover:text-red-400 transition-all cursor-pointer"
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
              className="w-full max-w-2xl h-full bg-white dark:bg-[#0a0c14] border-l border-slate-200/60 dark:border-white/8 shadow-2xl relative z-10 p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/4 pb-4">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-200">
                    {selectedId ? "Edit Profil Karyawan" : "Registrasi Karyawan Baru"}
                  </h2>
                  <button
                    onClick={handleCloseForm}
                    className="p-1 rounded bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-550 dark:text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form id="employee-form" onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-700 dark:text-slate-300">
                  {/* Bagian 1: Data Diri */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
                      <Users className="w-4 h-4" /> Data Diri Karyawan
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Nama Lengkap (Sesuai KTP)</label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Nomor NIK KTP (Enkripsi)</label>
                        <input type="text" required value={nik} onChange={e => setNik(e.target.value)} placeholder="16 digit NIK" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Tempat Lahir</label>
                        <input type="text" required value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="e.g. Jakarta" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Tanggal Lahir</label>
                        <input type="date" required value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Gender</label>
                        <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs">
                          <option value="male">Laki-Laki</option>
                          <option value="female">Perempuan</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Agama</label>
                        <input type="text" required value={religion} onChange={e => setReligion(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Pernikahan</label>
                        <input type="text" required value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 2: Kontak */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
                      <Phone className="w-4 h-4" /> Kontak & Akun
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">No. HP / WhatsApp</label>
                        <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxx" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Email Pribadi</label>
                        <input type="email" required value={personalEmail} onChange={e => setPersonalEmail(e.target.value)} placeholder="john@gmail.com" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="space-y-1">
                        <label className="font-semibold">Email Kantor (Email Login)</label>
                        <input type="email" required value={officeEmail} onChange={e => setOfficeEmail(e.target.value)} placeholder="john@perusahaan.com" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold flex items-center justify-between">
                          <span>{selectedId ? "Kata Sandi Baru" : "Kata Sandi Akun"}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-normal">
                            {selectedId ? "(Kosongkan jika tidak diubah)" : "(Kosongkan untuk default)"}
                          </span>
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder={selectedId ? "Ubah kata sandi..." : "Tentukan kata sandi login..."}
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 3: Alamat */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
                      <MapPin className="w-4 h-4" /> Alamat Lengkap
                    </h3>
                    <div className="space-y-4">
                      <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-xl border border-slate-200 dark:border-white/4 space-y-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider block border-b border-slate-200 dark:border-white/4 pb-1">Alamat Sesuai KTP</span>
                        <div className="space-y-1">
                          <label className="font-semibold block text-[11px] mb-1 text-slate-700 dark:text-slate-350">Jalan / RT / RW</label>
                          <input type="text" required value={ktpStreet} onChange={e => setKtpStreet(e.target.value)} placeholder="Nama Jalan, No. Rumah, RT/RW" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs" />
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

                      <div className="p-3 bg-slate-50 dark:bg-white/2 rounded-xl border border-slate-200/60 dark:border-white/4 space-y-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider block border-b border-slate-200 dark:border-white/4 pb-1">Alamat Domisili Aktif</span>
                        <div className="space-y-1">
                          <label className="font-semibold block text-[11px] mb-1 text-slate-700 dark:text-slate-350">Jalan / RT / RW</label>
                          <input type="text" required value={domicileStreet} onChange={e => setDomicileStreet(e.target.value)} placeholder="Nama Jalan, No. Rumah, RT/RW" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs" />
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
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
                      <CreditCard className="w-4 h-4" /> Akun Keuangan & Rekening Bank
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">NPWP (Enkripsi)</label>
                        <input type="text" required value={npwp} onChange={e => setNpwp(e.target.value)} placeholder="No. NPWP" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Pajak</label>
                        <input type="text" required value={taxStatus} onChange={e => setTaxStatus(e.target.value)} placeholder="TK/0, K/0, K/1" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold">Nama Bank</label>
                        <input type="text" required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Bank Mandiri" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">No Rekening (Enkripsi)</label>
                        <input type="text" required value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="No Rekening" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Atas Nama</label>
                        <input type="text" required value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} placeholder="Sesuai buku tabungan" className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Bagian 5: Penempatan */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
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
                        <input type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-white dark:bg-white/2 border border-slate-200/60 dark:border-white/8 shadow-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Kepegawaian</label>
                        <select value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs">
                          <option value="probation">Probation</option>
                          <option value="pkwt">PKWT</option>
                          <option value="pkwtt">PKWTT</option>
                          <option value="outsource">Outsource</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold">Status Aktivitas Karyawan</label>
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#0e1017] border border-slate-200/60 dark:border-white/8 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs">
                          <option value="onboarding">Onboarding</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="resigned">Resigned</option>
                        </select>
                      </div>
                    </div>

                    {!selectedId && (
                      <div className="space-y-1">
                        <h4 className="text-[10px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider mt-4 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-white/4">
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
                          <p className="text-[10px] text-slate-500 italic mt-1">
                            * Karyawan yang diberi role akan dibuatkan akun login otomatis dengan email kantor dan default password: <span className="font-mono text-slate-550 dark:text-slate-400">password123</span>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </div>

              <div className="border-t border-slate-200 dark:border-white/4 pt-4 mt-6 flex items-center justify-end gap-3 bg-white dark:bg-[#0a0c14] relative z-20">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/8 text-xs font-semibold text-slate-550 dark:text-slate-400 hover:text-slate-200 hover:bg-white dark:bg-white/2 cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="employee-form"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-200 dark:border-white/10 text-xs font-semibold cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 active:scale-[0.98] transition-all flex items-center gap-1.5"
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
