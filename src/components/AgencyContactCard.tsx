import { Phone, Mail, MapPin, Globe, Clock, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AgencyInfo {
  id: string;
  agency_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  website?: string;
  logo_url?: string;
  working_hours?: string;
}

interface AgencyContactCardProps {
  clientId?: string;
}

export function AgencyContactCard({ clientId }: AgencyContactCardProps) {
  const [agencyInfo, setAgencyInfo] = useState<AgencyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgencyInfo();
  }, []);

  const fetchAgencyInfo = async () => {
    try {
      let agentId: string | null = null;

      if (clientId) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('agent_id')
          .eq('id', clientId)
          .maybeSingle();

        agentId = clientData?.agent_id;
      } else {
        const { data: clientData } = await supabase
          .from('clients')
          .select('agent_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        agentId = clientData?.agent_id;
      }

      if (agentId) {
        const { data, error } = await supabase
          .from('agency_info')
          .select('*')
          .eq('agent_id', agentId)
          .maybeSingle();

        if (error) throw error;
        setAgencyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching agency info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-blue-200 rounded w-1/2 mb-4"></div>
          <div className="h-20 bg-blue-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!agencyInfo) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-6">
      <div className="flex items-start gap-4 mb-4">
        {agencyInfo.logo_url ? (
          <img
            src={agencyInfo.logo_url}
            alt={agencyInfo.agency_name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {agencyInfo.agency_name}
          </h3>
          <p className="text-sm text-gray-600">{agencyInfo.contact_person}</p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href={`tel:${agencyInfo.phone}`}
          className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition group"
        >
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition">
            <Phone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Telefon</p>
            <p className="font-medium">{agencyInfo.phone}</p>
          </div>
        </a>

        <a
          href={`mailto:${agencyInfo.email}`}
          className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition group"
        >
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition">
            <Mail className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">E-posta</p>
            <p className="font-medium">{agencyInfo.email}</p>
          </div>
        </a>

        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Adres</p>
            <p className="font-medium text-sm">{agencyInfo.address}</p>
          </div>
        </div>

        {agencyInfo.working_hours && (
          <div className="flex items-center gap-3 text-gray-700">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Çalışma Saatleri</p>
              <p className="font-medium text-sm">{agencyInfo.working_hours}</p>
            </div>
          </div>
        )}

        {agencyInfo.website && (
          <a
            href={agencyInfo.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition group"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Website</p>
              <p className="font-medium text-sm">{agencyInfo.website}</p>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}
