import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Button } from '~/components/ui/Button';
import { supabase } from '~/lib/supabase';
import type { Campus, Department } from '~/types';

interface ValidationItemProps {
  valid: boolean;
  text: string;
}

const ValidationItem = ({ valid, text }: ValidationItemProps) => (
  <div className={`flex items-center text-sm ${valid ? 'text-green-600' : 'text-gray-500'}`}>
    {valid ? (
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-4 h-4 mr-2 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )}
    {text}
  </div>
);

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [campusId, setCampusId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { register, isLoading } = useAuthStore();

  // Fetch campuses and departments
  useEffect(() => {
    const fetchData = async () => {
      const [campusesResult, departmentsResult] = await Promise.all([
        supabase.from('campuses').select('*').order('name'),
        supabase.from('departments').select('*').order('name'),
      ]);

      if (campusesResult.data) setCampuses(campusesResult.data);
      if (departmentsResult.data) setDepartments(departmentsResult.data);
    };

    fetchData();
  }, []);

  // Filter departments by selected campus
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => d.campus_id === campusId);
  }, [departments, campusId]);

  // Real-time password validation
  const passwordValidation = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: password === confirmPassword && password.length > 0,
    };
  }, [password, confirmPassword]);

  const isPasswordValid = passwordValidation.hasMinLength && 
    passwordValidation.hasNumber && 
    passwordValidation.hasSpecialChar;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters with 1 number and 1 special character');
      return;
    }

    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        middleName: middleName || undefined,
        dateOfBirth: dateOfBirth || undefined,
        sex: sex as 'male' | 'female' | undefined,
        contactNumber: contactNumber || undefined,
        campusId: campusId || undefined,
        departmentId: departmentId || undefined,
      });
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Registration successful!</p>
          <p className="text-sm mt-2">
            Please wait for admin verification before you can log in.
          </p>
          <p className="text-sm mt-2">
            <Link to="/login" className="underline font-medium">Go to login page</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Account Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Account Information</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@liceo.edu.ph"
              required
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
          <div>
            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="contactNumber"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="09XX XXX XXXX"
              required
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
              />
            </div>
          </div>
          
          {password.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
              <ValidationItem valid={passwordValidation.hasMinLength} text="At least 8 characters" />
              <ValidationItem valid={passwordValidation.hasNumber} text="At least 1 number" />
              <ValidationItem valid={passwordValidation.hasSpecialChar} text="At least 1 special character (!@#$%^&*)" />
              {confirmPassword.length > 0 && (
                <ValidationItem valid={passwordValidation.passwordsMatch} text="Passwords match" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Juan"
              required
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-700">
              Middle Name
            </label>
            <input
              type="text"
              id="middleName"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Dela"
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Cruz"
              required
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of Birth
            </label>
            <input
              type="date"
              id="dateOfBirth"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            />
          </div>
          <div>
            <label htmlFor="sex" className="block text-sm font-medium text-gray-700">
              Sex
            </label>
            <select
              id="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value)}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            >
              <option value="">Select sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Affiliation */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Affiliation</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="campusId" className="block text-sm font-medium text-gray-700">
              Campus <span className="text-red-500">*</span>
            </label>
            <select
              id="campusId"
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setDepartmentId(''); // Reset department when campus changes
              }}
              required
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500"
            >
              <option value="">Select campus</option>
              {campuses.map((campus) => (
                <option key={campus.id} value={campus.id}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <select
              id="departmentId"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              disabled={!campusId}
              className="mt-1 block w-full h-10 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-maroon-500 focus:outline-none focus:ring-maroon-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select department</option>
              {filteredDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !isPasswordValid || !passwordValidation.passwordsMatch}
      >
        {isLoading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
}
