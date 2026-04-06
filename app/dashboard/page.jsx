"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, LogOut, Clock, User, FileText, CheckCircle, X, Stethoscope, ChevronRight, ClipboardList, Pill, RefreshCw, AlertTriangle, Download, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  
  const [role, setRole] = useState(null); 
  const [username, setUsername] = useState("");
  const [patients, setPatients] = useState([]);
  
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const showError = (msg) => {
    setGlobalError(msg);
    setTimeout(() => setGlobalError(''), 5000);
  };

  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await fetch("/api/patients/queue");
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setPatients(data);
    } catch (err) {
      console.error(err);
      showError('Unable to connect to the server. Please check your connection.');
    } finally {
      setIsLoadingQueue(false);
    }
  };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // UPDATED: Added vitals to the initial state
  const [newPatientForm, setNewPatientForm] = useState({ 
    name: '', age: '', contact: '', bp: '', hr: '', height: '', weight: '', temp: '' 
  });
  const [addPatientError, setAddPatientError] = useState('');
  const [activeTab, setActiveTab] = useState('findings');
  
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadReport = async () => {
    setIsReportOpen(true);
    setIsLoadingReport(true);
    try {
      const res = await fetch("/api/reports/daily");
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        showError("Failed to fetch report.");
      }
    } catch (e) {
      showError("Network error fetching report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!reportData || !reportData.csvData || reportData.csvData.length === 0) {
       showError("No data to export.");
       return;
    }
    const headers = ["Consultation ID", "Patient Name", "Age", "Visit Type", "Symptoms", "Diagnosis", "Notes"];
    const rows = reportData.csvData.map(row => 
       [row.consultation_id, row.patient_name, row.age, row.visit_type, `"${row.symptoms?.replace(/"/g, '""') || ''}"`, `"${row.diagnosis?.replace(/"/g, '""') || ''}"`, `"${row.notes?.replace(/"/g, '""') || ''}"`]
    );
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RHU_Daily_Report_${new Date().toISOString().split('T')[0]}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const [draftConsultation, setDraftConsultation] = useState({
    symptoms: '', observations: '', diagnosis: '', notes: '', prescriptions: [], labs: []
  });
  const [tempPrescription, setTempPrescription] = useState({ name: '', dosage: '' });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setRole(data.user.role);
          setUsername(data.user.username);
          loadQueue();
        } else {
          router.push("/");
        }
      } catch (err) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  const queue = useMemo(() => {
    return patients.filter(p => p.status === 'Waiting' || p.status === 'In Progress')
      .sort((a, b) => {
        if (a.status === 'In Progress') return -1;
        if (b.status === 'In Progress') return 1;
        return a.arrivalTime.localeCompare(b.arrivalTime);
      });
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [patients, searchQuery]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch(err) {
      console.error('Logout error', err);
    }
    router.push("/");
  };

  // UPDATED: Strict Validations & Vitals Payload
  const handleAddPatient = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAddPatientError('');
    setIsSubmitting(true);

    const { name, age, contact, bp, hr, height, weight, temp } = newPatientForm;

    if (!name.trim() || !age || !contact.trim()) {
      setAddPatientError('Name, Age, and Contact fields are required.'); 
      setIsSubmitting(false);
      return;
    }

    if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      setAddPatientError('Patient Name must contain letters only (no numbers or special characters).');
      setIsSubmitting(false);
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 120) {
      setAddPatientError('Please enter a valid age (0-120).'); 
      setIsSubmitting(false);
      return;
    }

    if (!/^\d{11}$/.test(contact.trim())) {
      setAddPatientError('Mobile number must be exactly 11 digits long.');
      setIsSubmitting(false);
      return;
    }

    const isDuplicate = queue.some(p => 
      p.name.toLowerCase() === name.toLowerCase().trim()
    );

    if (isDuplicate) {
      setAddPatientError(`Error: ${name.trim()} is already in the Appointment Queue!`);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: name.trim(), 
          age: parsedAge, 
          contact: contact.trim(),
          vitals: { bp, hr, height, weight, temp },
          arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewPatientForm({ name: '', age: '', contact: '', bp: '', hr: '', height: '', weight: '', temp: '' });
        loadQueue();
      } else {
        setAddPatientError('Failed to add patient to database.');
      }
    } catch (err) {
      setAddPatientError('Network error. Could not reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePatientStatus = async (patientId, newStatus) => {
    setPatients(current => 
      current.map(p => {
        if (newStatus === 'In Progress' && p.status === 'In Progress') {
          return { ...p, status: 'Waiting' }; 
        }
        return p.id === patientId ? { ...p, status: newStatus } : p;
      })
    );

    try {
      await fetch(`/api/patients/${patientId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      loadQueue(); 
    } catch (err) {
      console.error(err);
      loadQueue(); 
    }
  };

  const handleAddPrescription = (e) => {
    e.preventDefault();
    if (!tempPrescription.name) return;
    setDraftConsultation(prev => ({
      ...prev, prescriptions: [...prev.prescriptions, tempPrescription]
    }));
    setTempPrescription({ name: '', dosage: '' });
  };

  const handleSaveAndComplete = async () => {
    if (!selectedPatient || isSubmitting) return;

    setIsSubmitting(true);
    setPatients(current => current.map(p => p.id === selectedPatient.id ? { ...p, status: 'Done' } : p));
    const oldPatient = selectedPatient;
    setSelectedPatient(null);
    setDraftConsultation({ symptoms: '', observations: '', diagnosis: '', notes: '', prescriptions: [], labs: [] });

    try {
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: oldPatient.id,
          visitType: 'Walk-in Consultation',
          symptoms: draftConsultation.symptoms,
          diagnosis: draftConsultation.diagnosis,
          notes: draftConsultation.notes,
          prescriptions: draftConsultation.prescriptions
        })
      });
      if (res.ok) {
        loadQueue();
      } else {
        throw new Error('Failed to save record');
      }
    } catch (err) {
      console.error('Network error', err);
      showError('Failed to save record. Please check your connection.');
      loadQueue();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!role) return null; 

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      
      <header className="bg-white border-b border-slate-300 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/logo.jpg" alt="RHU Calasiao Logo" className="w-16 h-16 rounded-full border-4 border-white shadow-sm" />
            <div>
              <h1 className="text-2xl font-black text-black tracking-tight">RURAL HEALTH UNIT (CALASIAO)</h1>
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-[#0073C0] border border-blue-200 mt-1 uppercase tracking-wider">
                {role} Panel • Welcome {username}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            {role === 'doctor' && (
              <button onClick={loadReport} className="flex items-center px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold transition-all shadow-md active:scale-95">
                <TrendingUp size={18} className="mr-2" /> End of Day Report
              </button>
            )}
            {role === 'staff' && (
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center px-5 py-2.5 bg-[#0258A4] hover:bg-[#01478B] text-white rounded-lg font-bold transition-all shadow-md">
                <Plus size={18} className="mr-2" /> Walk-in Patient
              </button>
            )}
          </div>
        </div>
      </header>

      {globalError && (
        <div className="fixed top-4 right-4 z-[60] bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={20} className="text-red-600" />
          <p className="font-bold text-sm">{globalError}</p>
          <button onClick={() => setGlobalError('')} className="text-red-600 hover:text-red-900 ml-4"><X size={16} /></button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <section className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-[#E8EEF8] border-b-2 border-slate-300 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#0073C0] flex items-center gap-2"><Clock size={22}/> Appointment Queuing</h2>
          </div>
          <div className="p-6 flex overflow-x-auto gap-4">
            {isLoadingQueue ? (
              <div className="w-full flex justify-center items-center gap-3 py-8">
                <RefreshCw size={28} className="text-[#0073C0] animate-spin" />
                <span className="text-black font-medium text-lg">Loading queue...</span>
              </div>
            ) : queue.length === 0 ? <p className="text-black font-medium w-full text-center py-4">Queue is empty.</p> : queue.map((patient) => (
              <div key={patient.id} className={`min-w-[280px] p-5 border-2 rounded-xl transition-all ${patient.status === 'In Progress' ? 'border-[#0073C0] shadow-lg bg-blue-50/50' : 'border-slate-300 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs font-black px-2.5 py-1 rounded border-2 ${patient.status === 'In Progress' ? 'bg-[#E8EEF8] text-[#0073C0] border-[#0073C0]' : 'bg-amber-100 text-amber-800 border-amber-300'}`}>{patient.status}</span>
                </div>
                <h3 className="font-black text-black text-xl truncate">{patient.name}</h3>
                <p className="text-sm font-semibold text-slate-800 mb-5">Arrived: {patient.arrivalTime}</p>

                {role === 'doctor' && patient.status === 'Waiting' && (
                  <button onClick={() => updatePatientStatus(patient.id, 'In Progress')} className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-black rounded-lg text-sm font-bold transition-colors border border-slate-400">Start Consultation</button>
                )}
                {role === 'doctor' && patient.status === 'In Progress' && (
                  <button onClick={() => { setSelectedPatient(patient); setActiveTab('findings'); }} className="w-full py-2.5 bg-[#0258A4] hover:bg-[#01478B] text-white rounded-lg text-sm font-bold transition-colors shadow-sm">Open Workspace</button>
                )}
                 {role === 'staff' && patient.status === 'In Progress' && (
                  <div className="w-full py-2.5 bg-blue-100 text-[#0258A4] rounded-lg text-sm font-bold text-center border border-blue-200">
                    Currently with Doctor
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border-2 border-slate-300 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-[#E8EEF8] border-b-2 border-slate-300 flex justify-between items-center">
            <h2 className="text-xl font-black text-[#0073C0] flex items-center gap-2"><FileText size={22}/> Patient Records</h2>
            <div className="relative w-72">
              <Search size={18} className="absolute left-3 top-2.5 text-black" />
              <input type="text" placeholder="Search records..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 border-2 border-slate-300 rounded-lg text-black font-medium outline-none focus:border-[#0258A4] placeholder:text-slate-600" />
            </div>
          </div>
          <table className="min-w-full divide-y divide-slate-300">
            <thead className="bg-slate-100 border-b-2 border-slate-300">
              <tr>
                <th className="px-6 py-3.5 text-left text-sm font-black text-black uppercase tracking-wide">Patient Name</th>
                <th className="px-6 py-3.5 text-left text-sm font-black text-black uppercase tracking-wide">Contact</th>
                <th className="px-6 py-3.5 text-left text-sm font-black text-black uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPatients.map((patient) => (
                <tr key={patient.id} onClick={() => setSelectedPatient(patient)} className="hover:bg-slate-100 cursor-pointer transition-colors">
                  <td className="px-6 py-4 font-bold text-black text-base">{patient.name} <span className="text-slate-700 font-semibold text-sm ml-2">({patient.id})</span></td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{patient.contact}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md border-2 ${
                      patient.status === 'Done' ? 'bg-[#E8F5E9] text-[#36B151] border-[#36B151]' :
                      patient.status === 'In Progress' ? 'bg-[#E8EEF8] text-[#0073C0] border-[#0073C0]' :
                      'bg-slate-200 text-black border border-slate-400'
                    }`}>
                      {patient.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <button onClick={handleLogout} className="fixed bottom-6 right-6 flex items-center px-5 py-3.5 bg-white border-2 border-[#0258A4] text-[#0258A4] rounded-full shadow-2xl hover:text-white hover:bg-[#0258A4] font-bold text-sm transition-all">
        <LogOut size={18} className="mr-2" /> Logout
      </button>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl border-2 border-slate-300 my-auto">
            <div className="px-6 py-4 border-b border-slate-300 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
              <h3 className="font-black text-xl text-black">Add Walk-in</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-black hover:text-red-600"><X size={24}/></button>
            </div>
            
            {/* UPDATED: Form includes Validations & Vitals grid */}
            <form onSubmit={handleAddPatient} className="p-6 space-y-4">
              {addPatientError && <div className="p-3 bg-red-100 text-red-800 font-bold text-sm rounded-lg border border-red-300">{addPatientError}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-black mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Juan Dela Cruz" 
                    required 
                    value={newPatientForm.name} 
                    onChange={e => setNewPatientForm({...newPatientForm, name: e.target.value.replace(/[^A-Za-z\s]/g, '')})} 
                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-black mb-1">Age <span className="text-red-500">*</span></label>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="e.g. 35" 
                    required 
                    value={newPatientForm.age} 
                    onChange={e => setNewPatientForm({...newPatientForm, age: e.target.value.replace(/\D/g, '')})} 
                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-1">Mobile Number <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    maxLength="11"
                    placeholder="e.g. 09123456789" 
                    required 
                    value={newPatientForm.contact} 
                    onChange={e => setNewPatientForm({...newPatientForm, contact: e.target.value.replace(/\D/g, '').slice(0, 11)})} 
                    className="w-full p-2.5 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" 
                  />
                </div>
              </div>

              {/* VITAL SIGNS SECTION */}
              <div className="bg-slate-50 p-4 border-2 border-slate-200 rounded-xl mt-4">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Vital Signs (Optional Initial Triage)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">BP (mmHg)</label>
                    <input 
                      type="text" 
                      placeholder="120/80" 
                      value={newPatientForm.bp} 
                      // Allows ONLY numbers and the slash '/' symbol
                      onChange={e => setNewPatientForm({...newPatientForm, bp: e.target.value.replace(/[^\d/]/g, '')})} 
                      className="w-full p-2 border-2 border-slate-300 rounded text-sm text-black outline-none focus:border-[#0258A4]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Heart Rate (bpm)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="80" 
                      value={newPatientForm.hr} 
                      // Allows ONLY numbers (blocks decimals, negatives, and letters)
                      onChange={e => setNewPatientForm({...newPatientForm, hr: e.target.value.replace(/\D/g, '')})} 
                      className="w-full p-2 border-2 border-slate-300 rounded text-sm text-black outline-none focus:border-[#0258A4]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Temp (°C)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="36.5" 
                      value={newPatientForm.temp} 
                      // Allows numbers and a SINGLE decimal point (blocks negatives and letters)
                      onChange={e => setNewPatientForm({...newPatientForm, temp: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} 
                      className="w-full p-2 border-2 border-slate-300 rounded text-sm text-black outline-none focus:border-[#0258A4]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Weight (kg)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="65" 
                      value={newPatientForm.weight} 
                      // Allows numbers and a SINGLE decimal point (blocks negatives and letters)
                      onChange={e => setNewPatientForm({...newPatientForm, weight: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} 
                      className="w-full p-2 border-2 border-slate-300 rounded text-sm text-black outline-none focus:border-[#0258A4]" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-black mb-1">Height (cm)</label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      placeholder="165" 
                      value={newPatientForm.height} 
                      // Allows numbers and a SINGLE decimal point (blocks negatives and letters)
                      onChange={e => setNewPatientForm({...newPatientForm, height: e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1')})} 
                      className="w-full p-2 border-2 border-slate-300 rounded text-sm text-black outline-none focus:border-[#0258A4]" 
                    />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className={`w-full py-3 mt-4 bg-[#0258A4] hover:bg-[#01478B] text-white rounded-lg font-bold text-base shadow-md transition-colors flex justify-center items-center gap-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {isSubmitting && <RefreshCw size={18} className="animate-spin"/>} Add to Queue
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedPatient && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className={`bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-slate-300 ${role==='doctor' ? 'w-full max-w-5xl h-[85vh]' : 'w-full max-w-lg'}`}>
            <div className="bg-[#0258A4] px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h2 className="font-black text-xl text-white">{selectedPatient.name}</h2>
                <p className="text-sm font-bold text-blue-100">ID: {selectedPatient.id}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-white hover:text-blue-200"><X size={28}/></button>
            </div>

            {role === 'staff' && (
              <div className="p-6 bg-slate-50 flex-1">
                <h3 className="font-black text-black text-lg border-b-2 border-slate-300 pb-2 mb-4">Walk-in History</h3>
                {selectedPatient.history.length === 0 ? <p className="text-black font-medium">No history on record.</p> : selectedPatient.history.map(r => (
                  <div key={r.id} className="p-4 bg-white border-2 border-slate-300 rounded-lg mb-3 flex justify-between items-center shadow-sm hover:border-[#0073C0] transition-colors">
                    <span className="font-bold text-black text-base">{r.date}</span>
                    <span className="text-[#36B151] font-bold text-sm bg-[#E8F5E9] px-2.5 py-1 rounded border border-[#36B151]">Medical Data Hidden</span>
                  </div>
                ))}
              </div>
            )}

            {role === 'doctor' && (
              <div className="flex flex-1 overflow-hidden bg-slate-50">
                <div className="w-1/3 border-r-2 border-slate-300 bg-white p-5 overflow-y-auto space-y-5">
                  <h3 className="font-black text-black text-lg mb-5 border-b-2 border-slate-200 pb-2">Patient History</h3>
                  {selectedPatient.history.length === 0 && <p className="text-slate-600 font-medium italic">No previous records.</p>}
                  {selectedPatient.history.map(r => (
                    <div key={r.id} className="mb-5 pl-4 border-l-4 border-[#0258A4] bg-slate-50 p-3 rounded-md border border-slate-200 shadow-sm">
                      <p className="text-base font-black text-black">{r.date}</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 bg-white p-2 rounded border border-slate-300">Diag: {r.medical.diagnosis}</p>
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex border-b-2 border-slate-300 bg-white">
                     {['findings', 'prescriptions'].map(t => (
                       <button key={t} onClick={()=>setActiveTab(t)} className={`px-6 py-4 text-base font-black capitalize transition-all ${activeTab===t ? 'text-[#0073C0] border-b-4 border-[#0073C0] bg-blue-50/50' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`}>{t}</button>
                     ))}
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto bg-white">
                    {activeTab === 'findings' && (
                      <div className="space-y-5">
                        <div>
                           <label className="block text-sm font-bold text-black mb-1">Symptoms</label>
                           <textarea placeholder="Enter patient symptoms..." value={draftConsultation.symptoms} onChange={e=>setDraftConsultation({...draftConsultation, symptoms: e.target.value})} className="w-full p-3 border-2 border-slate-300 rounded-lg h-24 text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-black mb-1">Diagnosis</label>
                           <input type="text" placeholder="Enter primary diagnosis..." value={draftConsultation.diagnosis} onChange={e=>setDraftConsultation({...draftConsultation, diagnosis: e.target.value})} className="w-full p-3 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-black mb-1">Doctor Notes</label>
                           <textarea placeholder="Enter detailed medical notes..." value={draftConsultation.notes} onChange={e=>setDraftConsultation({...draftConsultation, notes: e.target.value})} className="w-full p-3 border-2 border-slate-300 rounded-lg h-32 text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" />
                        </div>
                      </div>
                    )}
                    {activeTab === 'prescriptions' && (
                      <div className="space-y-5">
                        <form onSubmit={handleAddPrescription} className="flex gap-3 bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                          <input type="text" placeholder="Medication Name" value={tempPrescription.name} onChange={e=>setTempPrescription({...tempPrescription, name: e.target.value})} className="flex-1 p-3 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" />
                          <input type="text" placeholder="Dosage (e.g. 50mg)" value={tempPrescription.dosage} onChange={e=>setTempPrescription({...tempPrescription, dosage: e.target.value})} className="flex-1 p-3 border-2 border-slate-300 rounded-lg text-black font-medium focus:border-[#0258A4] outline-none placeholder:text-slate-600" />
                          <button type="submit" className="bg-[#0258A4] hover:bg-[#01478B] text-white px-6 font-bold rounded-lg shadow-sm transition-colors">Add</button>
                        </form>
                        <div className="space-y-3 mt-4">
                          {draftConsultation.prescriptions.length === 0 && <p className="text-slate-600 font-medium italic">No prescriptions added yet for this session.</p>}
                          {draftConsultation.prescriptions.map((p, i) => (
                            <div key={i} className="bg-slate-50 p-4 border-2 border-slate-300 rounded-lg text-base flex justify-between shadow-sm">
                              <span className="font-black text-black">{p.name}</span>
                              <span className="font-bold text-slate-800">{p.dosage}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5 border-t-2 border-slate-300 bg-white flex justify-end">
                    <button onClick={handleSaveAndComplete} disabled={isSubmitting} className={`px-8 py-3 bg-[#36B151] hover:bg-[#2A8F41] text-white rounded-lg font-black text-base shadow-lg flex items-center gap-2 transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}>
                      {isSubmitting ? <RefreshCw size={20} className="animate-spin"/> : <CheckCircle size={20}/>} 
                      {isSubmitting ? 'Saving...' : 'Save & Complete Record'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-slate-300 w-full max-w-3xl max-h-[90vh]">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
              <h2 className="font-black text-xl flex items-center gap-2"><TrendingUp size={22}/> End of Day Analytics</h2>
              <button onClick={() => setIsReportOpen(false)} className="text-slate-300 hover:text-white"><X size={28}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {isLoadingReport ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                   <RefreshCw size={40} className="text-slate-800 animate-spin" />
                   <p className="font-bold text-slate-600">Aggregating day's consultations...</p>
                </div>
              ) : reportData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-5 border-2 border-slate-300 rounded-xl shadow-sm">
                       <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">Total Patients Today</p>
                       <p className="text-4xl font-black text-[#0073C0] mt-1">{reportData.summary.totalPatients}</p>
                    </div>
                    <div className="bg-white p-5 border-2 border-slate-300 rounded-xl shadow-sm">
                       <p className="text-slate-500 font-bold text-sm uppercase tracking-wide">Total Diagnoses Given</p>
                       <p className="text-4xl font-black text-[#36B151] mt-1">{reportData.summary.topDiagnoses.length}</p>
                    </div>
                  </div>

                  <div className="bg-white border-2 border-slate-300 rounded-xl shadow-sm overflow-hidden">
                    <div className="bg-slate-100 px-5 py-3 border-b-2 border-slate-300 font-bold text-slate-800">
                      Most Common Diagnoses
                    </div>
                    <ul className="divide-y divide-slate-200">
                      {reportData.summary.topDiagnoses.length === 0 && <li className="p-5 text-slate-500 font-medium">No recorded diagnoses today.</li>}
                      {reportData.summary.topDiagnoses.map((item, idx) => (
                        <li key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50">
                          <span className="font-bold text-black text-lg">{item.diagnosis}</span>
                          <span className="bg-[#E8EEF8] text-[#0073C0] font-black px-3 py-1 rounded-full border border-blue-200">{item.count} Cases</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-center text-red-600 font-bold py-10">Report data could not be loaded.</p>
              )}
            </div>
            
            <div className="p-5 border-t-2 border-slate-300 bg-white flex justify-end">
               <button onClick={handleDownloadCSV} disabled={isLoadingReport || !reportData} className="px-6 py-2.5 bg-[#0258A4] hover:bg-[#01478B] text-white rounded-lg font-bold text-base shadow-md flex items-center gap-2 transition-colors disabled:opacity-50">
                 <Download size={18}/> Export CSV Report
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}