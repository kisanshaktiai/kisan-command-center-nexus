
export interface StandardTenantFormProps {
  mode: 'create' | 'edit';
  initialData?: any;
  onSubmit: (data: any) => Promise<boolean>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface StandardTenantCardProps {
  tenant: any;
  formattedData: any;
  size?: 'small' | 'large' | 'analytics';
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

export interface StandardTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant?: any;
  formattedData?: any;
}

export interface StandardTenantFilterProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterType: string;
  setFilterType: (type: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}
