CONSTRAINTS

- name, stage, period, sector, notes, tags attributes must be string
- stage string value must be one of the values from `stages` collection from Cockpit API
- period string value must be one of the values from `financialquarters` collection from Cockpit API
- sector string value must be one of the values from `sectors` collection from Cockpit API
- value must be number
- owner must be `CockpitUser` type aka `users` collection from Cockpit API
- client must be `CockpitClient` type aka `clients` collection from Cockpit API
- use the existing style, layout and UIUX of BIM.Visitplan screens and forms

Instructions

- To work on New enhancement: `Add Deal` screen or form

- Prepare a detailed phase by phase implementation plan and get my confirmation for the plan

- Save the confirmed implementation plan into `@ai/add-pipeline/PLAN.md`

- DO NOT START ANY IMPLEMENTATION WITHOUT MY APPROVAL!

- You can look at the `@ai/add-pipeline/new-deal-form.png` and `@ai/add-pipeline/edit-deal-form.png` for the form interface fields

- You can refer to the `@ai/add-pipeline/DealModal.tsx` and following code snippets to learn react component structure and functions

```
const addDeal = useCallback(async (data: Partial<Deal>): Promise<void> => {
    setSaving(true);
    setSavingError(null);

    try {
      if (!isTeamMode) {
        const localDeal = buildPersonalDeal(data);
        await put('deals', localDeal);
      } else if (browserOnline) {
        const created = await createRemoteDeal(data, isTeamMode ? effectiveUserId ?? undefined : undefined);
        await put('deals', created);
      } else {
        const localDeal = buildTeamLocalDeal(data, isTeamMode ? effectiveUserId : null, authState?.userName ?? '');
        await put('deals', localDeal);
        await enqueue({
          action: 'create',
          collection: 'deals',
          payload: localDeal,
          tempId: localDeal._id,
          timestamp: Date.now(),
        });
      }

      await refreshFromStore();
      await refreshQueueCount();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save deal';
      setSavingError(message);
      throw err;
    } finally {
      setSaving(false);
    }
}, [authState?.userName, browserOnline, effectiveUserId, refreshFromStore, refreshQueueCount]);
```

```
  const handleDealSave = async (data: Partial<Deal>) => {
    setDealModalError(null);
    try {
      if (selectedDeal) {
        await editDeal(selectedDeal._id, data);
      } else {
        await addDeal(data);
      }
    } catch (err: unknown) {
      setDealModalError(err instanceof Error ? err.message : 'Failed to save deal');
      throw err;
    }
  };
```

```
<DealModal
  deal={selectedDeal}
  stages={stages}
  sectors={sectorOptions}
  periods={periodOptions}
  clients={clientOptions}
  onSave={handleDealSave}
  onDelete={handleDealDelete}
  onClose={() => {
    setSelectedDeal(null);
    setIsAddModalOpen(false);
    setDealModalError(null);
  }}
  saving={saving}
  deleting={deleting}
  error={dealModalError}
/>
```

- Refer to the following `types.ts` and `example deal data` to learn about `deal` attribute

types.ts
```ts
export type CockpitUser = {
  _id: string;
  name: string;
  email: string;
  ms_email?: string | null;
  ms_id?: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  active: boolean;
};

export type CockpitClient = {
  _id: string;
  name: string;
  sector?: string | null;
  account_type?: AccountType | null;
  status: ClientStatus;
  am?: Pick<CockpitUser, '_id' | 'name'> | null;
};

export type Stage = {
  _id: string;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
};

export type Deal = {
  _id: string;
  name: string;
  value: number;
  stage: string;
  period: string;
  sector: string;
  notes?: string;
  tags?: string;
  sort_order?: number | null;
  owner?: Pick<CockpitUser, '_id' | 'name'> | null;
  client?: Pick<CockpitClient, '_id' | 'name'> | null;
  _modified?: number;
  _created?: number;
  _pending?: boolean;
};
```

example deal data
```json
{
    "_id": "6a012fe33a92a8810708650f",
    "name": "Yar Kyaw Hospital App",
    "client": null,
    "value": 75000,
    "stage": "pause",
    "period": "Q2 FY2026",
    "sector": "Healthcare",
    "notes": "QMS + Loyalty + Booking\n75000 quotation but project won't happen in 2025",
    "tags": "qms,loyalty",
    "sort_order": null,
    "owner": {
      "_id": "6a0087d93a92a881070864ef",
      "_model": "users"
    },
    "_state": 1,
    "_modified": 1778467290,
    "_mby": "68d4c16b76b64d6baf05590f",
    "_created": 1778462691,
    "_cby": "68d4c16b76b64d6baf05590f"
},
```
- INTERVIEW ME UNTIL YOU ARE CLEAR ABOUT YOUR TASK!
