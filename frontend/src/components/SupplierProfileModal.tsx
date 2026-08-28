import React from 'react';
import { X, Building, User as UserIcon, Mail, Phone, Briefcase, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { UserSafeProfile, Supplier } from '../types';

interface SupplierProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSafeProfile | null;
  supplier: Supplier | null;
}

export const SupplierProfileModal: React.FC<SupplierProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  supplier
}) => {
  if (!isOpen || !user) return null;

  const companyName = supplier?.name || user.supplierName || 'Apex Precision Engineering Ltd';
  const contactPerson = user.name || 'Authorized Representative';
  const email = user.email;
  const phone = user.phone || '+91 98765 43210';
  const industry = supplier?.industry || 'Automotive & Industrial Components';
  const accountType = 'Supplier';

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-blue)'
            }}>
              <Building size={16} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Supplier Profile
            </h2>
          </div>
          <p style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
            Read-only verified enterprise account details.
          </p>
        </div>

        {/* Profile Details List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Company Name */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Company Name
            </span>
            <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {companyName}
            </strong>
          </div>

          {/* Contact Person */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Contact Person
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 500 }}>
              {contactPerson}
            </span>
          </div>

          {/* Email */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Email
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {email}
            </span>
          </div>

          {/* Phone */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Phone
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
              {phone}
            </span>
          </div>

          {/* Business / Sector */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Business / Sector
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
              {industry}
            </span>
          </div>

          {/* Account Type */}
          <div style={{
            padding: '10px 14px',
            background: '#f8fafc',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                Account Type
              </span>
              <strong style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
                {accountType}
              </strong>
            </div>
            <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
              <CheckCircle2 size={12} />
              Verified
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '22px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '9px',
              fontSize: '0.85rem',
              fontWeight: 600,
              justifyContent: 'center'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
