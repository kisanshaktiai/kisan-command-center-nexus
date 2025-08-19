import React, { useState, useEffect } from 'react';
import { UpdateTenantDTO } from '@/types/tenant';
import { TenantStatus, SubscriptionPlan, TenantStatusValue, SubscriptionPlanValue } from '@/types/enums';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Select,
  SelectItem,
  Textarea
} from "@nextui-org/react";

interface TenantEditModalProps {
  tenant: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: UpdateTenantDTO) => Promise<boolean>;
}

const TenantEditModal: React.FC<TenantEditModalProps> = ({
  tenant,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<UpdateTenantDTO>({
    name: '',
    status: TenantStatus.TRIAL as TenantStatusValue,
    subscription_plan: SubscriptionPlan.KISAN_BASIC as SubscriptionPlanValue,
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        status: tenant.status || TenantStatus.TRIAL as TenantStatusValue,
        subscription_plan: tenant.subscription_plan || SubscriptionPlan.KISAN_BASIC as SubscriptionPlanValue,
      });
    }
  }, [tenant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tenant) {
      const updateData: UpdateTenantDTO = {
        ...formData,
        status: formData.status as TenantStatusValue,
        subscription_plan: formData.subscription_plan as SubscriptionPlanValue,
      };
      
      const success = await onSave(tenant.id, updateData);
      if (success) {
        onClose();
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur">
      <ModalContent>
        {(closeModal) => (
          <form onSubmit={handleSubmit}>
            <ModalHeader className="flex flex-col gap-1">Edit Tenant</ModalHeader>
            <ModalBody>
              <Input
                type="text"
                label="Tenant Name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
              />

              <Select
                label="Status"
                name="status"
                selectedKeys={[formData.status || TenantStatus.TRIAL]}
                onSelectionChange={(value) => setFormData(prev => ({ ...prev, status: value.currentKey as TenantStatusValue }))}
              >
                <SelectItem key={TenantStatus.TRIAL} value={TenantStatus.TRIAL}>{TenantStatus.TRIAL}</SelectItem>
                <SelectItem key={TenantStatus.ACTIVE} value={TenantStatus.ACTIVE}>{TenantStatus.ACTIVE}</SelectItem>
                <SelectItem key={TenantStatus.SUSPENDED} value={TenantStatus.SUSPENDED}>{TenantStatus.SUSPENDED}</SelectItem>
                <SelectItem key={TenantStatus.ARCHIVED} value={TenantStatus.ARCHIVED}>{TenantStatus.ARCHIVED}</SelectItem>
                <SelectItem key={TenantStatus.PENDING_APPROVAL} value={TenantStatus.PENDING_APPROVAL}>{TenantStatus.PENDING_APPROVAL}</SelectItem>
                <SelectItem key={TenantStatus.EXPIRED} value={TenantStatus.EXPIRED}>{TenantStatus.EXPIRED}</SelectItem>
              </Select>

              <Select
                label="Subscription Plan"
                name="subscription_plan"
                selectedKeys={[formData.subscription_plan || SubscriptionPlan.KISAN_BASIC]}
                onSelectionChange={(value) => setFormData(prev => ({ ...prev, subscription_plan: value.currentKey as SubscriptionPlanValue }))}
              >
                <SelectItem key={SubscriptionPlan.KISAN_BASIC} value={SubscriptionPlan.KISAN_BASIC}>{SubscriptionPlan.KISAN_BASIC}</SelectItem>
                <SelectItem key={SubscriptionPlan.SHAKTI_GROWTH} value={SubscriptionPlan.SHAKTI_GROWTH}>{SubscriptionPlan.SHAKTI_GROWTH}</SelectItem>
                <SelectItem key={SubscriptionPlan.AI_ENTERPRISE} value={SubscriptionPlan.AI_ENTERPRISE}>{SubscriptionPlan.AI_ENTERPRISE}</SelectItem>
                <SelectItem key={SubscriptionPlan.CUSTOM_ENTERPRISE} value={SubscriptionPlan.CUSTOM_ENTERPRISE}>{SubscriptionPlan.CUSTOM_ENTERPRISE}</SelectItem>
              </Select>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="flat" onPress={onClose}>
                Close
              </Button>
              <Button color="primary" type="submit">
                Save
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  );
};

export default TenantEditModal;
