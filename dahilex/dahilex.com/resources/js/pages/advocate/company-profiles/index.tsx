import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Edit, User, ArrowLeft, Eye } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';

export default function CompanyProfiles() {
  const { t } = useTranslation();
  const { companyProfile } = usePage().props as any;
  const [isEditing, setIsEditing] = useState(!companyProfile);
  const [originalData, setOriginalData] = useState<typeof formData | null>(null);
  const [formData, setFormData] = useState({
    // Personal Details
    advocate_name: '',
    bar_registration_number: '',
    years_of_experience: '',

    // Contact Details
    email: '',
    phone: '',
    website: '',
    address: '',

    // Professional Details
    law_degree: '',
    university: '',
    specialization: '',

    // Court & Jurisdiction
    court_jurisdictions: '',
    languages_spoken: '',

    // Business Details
    consultation_fees: '',
    office_hours: '',
    success_rate: '',

    // Company Details
    name: '',
    registration_number: '',
    establishment_date: '',
    company_size: 'solo',
    business_type: 'law_firm',

    // Services
    services_offered: '',
    notable_cases: '',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (companyProfile) {
      setFormData({
        advocate_name: companyProfile.advocate_name || '',
        bar_registration_number: companyProfile.bar_registration_number || '',
        years_of_experience: companyProfile.years_of_experience || '',
        email: companyProfile.email || '',
        phone: companyProfile.phone || '',
        website: companyProfile.website || '',
        address: companyProfile.address || '',
        law_degree: companyProfile.law_degree || '',
        university: companyProfile.university || '',
        specialization: companyProfile.specialization || '',
        court_jurisdictions: companyProfile.court_jurisdictions || '',
        languages_spoken: companyProfile.languages_spoken || '',
        consultation_fees: companyProfile.consultation_fees || '',
        office_hours: companyProfile.office_hours || '',
        success_rate: companyProfile.success_rate || '',
        name: companyProfile.name || '',
        registration_number: companyProfile.registration_number || '',
        establishment_date: companyProfile.establishment_date ? companyProfile.establishment_date.split('T')[0] : '',
        company_size: companyProfile.company_size || 'solo',
        business_type: companyProfile.business_type || 'law_firm',
        services_offered: companyProfile.services_offered || '',
        notable_cases: companyProfile.notable_cases || '',
        description: companyProfile.description || '',
        status: companyProfile.status || 'active'
      });
    }
  }, [companyProfile]);

  const handleCancel = () => {
    if (originalData) setFormData(originalData);
    setIsEditing(false);
  };

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure required fields have values
    const submitData = {
      ...formData,
      company_size: formData.company_size || 'solo',
      business_type: formData.business_type || 'law_firm'
    };

    if (companyProfile) {
      // Update existing profile
      router.put(route('advocate.company-profiles.update', companyProfile?.id || 1), submitData, {
        onSuccess: () => {
          toast.success(t('Advocate profile updated successfully'));
          setOriginalData(null);
          setIsEditing(false);
        },
        onError: (errors) => {
          if (typeof errors === 'object' && errors !== null) {
            const errorMessages = Object.values(errors).flat().join(', ');
            toast.error(errorMessages);
          } else {
            toast.error(t('Failed to update advocate profile'));
          }
        }
      });
    } else {
      // Create new profile
      router.post(route('advocate.company-profiles.store'), submitData, {
        onSuccess: () => {
          toast.success(t('Advocate profile created successfully'));
          setOriginalData(null);
          setIsEditing(false);
        },
        onError: (errors) => {
          if (typeof errors === 'object' && errors !== null) {
            const errorMessages = Object.values(errors).flat().join(', ');
            toast.error(errorMessages);
          } else {
            toast.error(t('Failed to create advocate profile'));
          }
        }
      });
    }
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Advocate'), href: route('advocate.company-profiles.index') },
    { title: t('Company Profile') }
  ];

  const pageActions = [
    {
      label: isEditing ? t('View') : t('Edit Profile'),
      icon: isEditing ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />,
      variant: isEditing ? 'outline' : 'default',
      onClick: () => {
        if (!isEditing) setOriginalData(formData);
        else handleCancel();
        if (!isEditing) setIsEditing(true);
      }
    }
  ];

  return (
    <PageTemplate
      title={t("Company Profile")}
      description={isEditing ? t('Update your firm profile, contact details and company information.') : t('View your firm profile, contact details and company information.')}
      url="/advocate/company-profiles"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5" />
              {t('Personal Information')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('Basic advocate details and contact information')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="advocate_name" className="text-sm font-medium">{t('Advocate Name')}{isEditing && <span className="text-red-500"> *</span>}</Label>
              <Input
                id="advocate_name"
                value={formData.advocate_name}
                onChange={(e) => handleChange('advocate_name', e.target.value)}
                disabled={!isEditing}
                required
                placeholder="eg. John Smith"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="bar_registration_number" className="text-sm font-medium">{t('Bar Registration Number')}{isEditing && <span className="text-red-500"> *</span>}</Label>
              <Input
                id="bar_registration_number"
                value={formData.bar_registration_number}
                onChange={(e) => handleChange('bar_registration_number', e.target.value)}
                disabled={!isEditing}
                required
                placeholder="eg. BAR123456"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm font-medium">{t('Email')}{isEditing && <span className="text-red-500"> *</span>}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                disabled={!isEditing}
                required
                placeholder="eg. john@example.com"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-sm font-medium">{t('Phone')}{isEditing && <span className="text-red-500"> *</span>}</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                disabled={!isEditing}
                required
                placeholder="eg. +1 555 000 0000"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="years_of_experience" className="text-sm font-medium">{t('Years of Experience')}</Label>
              <Input
                id="years_of_experience"
                type="number"
                value={formData.years_of_experience}
                onChange={(e) => handleChange('years_of_experience', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. 5"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="website" className="text-sm font-medium">{t('Website')}</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. https://example.com"
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="address" className="text-sm font-medium">{t('Address')}{isEditing && <span className="text-red-500"> *</span>}</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                disabled={!isEditing}
                rows={2}
                required
                placeholder="eg. 123 Main St, New York, NY 10001"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('Professional Details')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('Educational background and specialization')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="law_degree" className="text-sm font-medium">{t('Law Degree')}</Label>
              <Input
                id="law_degree"
                value={formData.law_degree}
                onChange={(e) => handleChange('law_degree', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. Juris Doctor (JD)"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="university" className="text-sm font-medium">{t('University')}</Label>
              <Input
                id="university"
                value={formData.university}
                onChange={(e) => handleChange('university', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. Harvard Law School"
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="specialization" className="text-sm font-medium">{t('Specialization')}</Label>
              <Textarea
                id="specialization"
                value={formData.specialization}
                onChange={(e) => handleChange('specialization', e.target.value)}
                disabled={!isEditing}
                rows={2}
                placeholder="eg. Corporate Law, Intellectual Property"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="court_jurisdictions" className="text-sm font-medium">{t('Court Jurisdictions')}</Label>
              <Textarea
                id="court_jurisdictions"
                value={formData.court_jurisdictions}
                onChange={(e) => handleChange('court_jurisdictions', e.target.value)}
                disabled={!isEditing}
                rows={2}
                placeholder="eg. Federal Court, State Court"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="languages_spoken" className="text-sm font-medium">{t('Languages Spoken')}</Label>
              <Input
                id="languages_spoken"
                value={formData.languages_spoken}
                onChange={(e) => handleChange('languages_spoken', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. English, Spanish"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('Business Details')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('Practice and consultation information')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consultation_fees" className="text-sm font-medium">{t('Consultation Fees')}</Label>
              <Input
                id="consultation_fees"
                type="number"
                value={formData.consultation_fees}
                onChange={(e) => handleChange('consultation_fees', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. 150"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="success_rate" className="text-sm font-medium">{t('Success Rate (%)')}</Label>
              <Input
                id="success_rate"
                type="number"
                max="100"
                value={formData.success_rate}
                onChange={(e) => handleChange('success_rate', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. 85"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="office_hours" className="text-sm font-medium">{t('Office Hours')}</Label>
              <Input
                id="office_hours"
                value={formData.office_hours}
                onChange={(e) => handleChange('office_hours', e.target.value)}
                disabled={!isEditing}
                placeholder="e.g., Mon-Fri 9:00 AM - 6:00 PM"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="company_size" className="text-sm font-medium">{t('Practice Size')}</Label>
              <Select
                value={formData.company_size || 'solo'}
                onValueChange={(value) => handleChange('company_size', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solo" className="text-sm">{t('Solo Practice')}</SelectItem>
                  <SelectItem value="small" className="text-sm">{t('Small Firm')}</SelectItem>
                  <SelectItem value="medium" className="text-sm">{t('Medium Firm')}</SelectItem>
                  <SelectItem value="large" className="text-sm">{t('Large Firm')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="services_offered" className="text-sm font-medium">{t('Services Offered')}</Label>
              <Textarea
                id="services_offered"
                value={formData.services_offered}
                onChange={(e) => handleChange('services_offered', e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="eg. Contract Drafting, Litigation, Legal Consulting"
                className="text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notable_cases" className="text-sm font-medium">{t('Notable Cases')}</Label>
              <Textarea
                id="notable_cases"
                value={formData.notable_cases}
                onChange={(e) => handleChange('notable_cases', e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="eg. Smith v. Jones (2020), landmark IP case"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Firm Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('Firm Details')}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">{t('Legal firm registration and business information')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium" required={isEditing}>{t('Firm Name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. Acme Law Firm"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="registration_number" className="text-sm font-medium" required>{t('Registration Number')}</Label>
              <Input
                id="registration_number"
                value={formData.registration_number}
                onChange={(e) => handleChange('registration_number', e.target.value)}
                disabled={!isEditing}
                placeholder="eg. REG123456"
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="establishment_date" className="text-sm font-medium">{t('Establishment Date')}</Label>
              <DatePicker
                id="establishment_date"
                selected={formData.establishment_date}
                onChange={(e) => handleChange('establishment_date', e)}
                disabled={!isEditing}
                className="w-full"
              />
            </div>
            <div>
              <Label htmlFor="business_type" className="text-sm font-medium">{t('Business Type')}</Label>
              <Select
                value={formData.business_type || 'law_firm'}
                onValueChange={(value) => handleChange('business_type', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="law_firm" className="text-sm">{t('Law Firm')}</SelectItem>
                  <SelectItem value="corporate_legal" className="text-sm">{t('Corporate Legal')}</SelectItem>
                  <SelectItem value="government" className="text-sm">{t('Government')}</SelectItem>
                  <SelectItem value="other" className="text-sm">{t('Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="description" className="text-sm font-medium">{t('Description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                disabled={!isEditing}
                rows={3}
                placeholder="eg. A full-service law firm specializing in corporate and commercial law"
                className="text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="flex justify-end gap-3">
            {companyProfile && <Button type="button" onClick={handleCancel} variant={'outline'} className="flex items-center gap-2">
              {t('Cancel')}
            </Button>}
            <Button type="submit" className="flex items-center gap-2">
              {t('Save')}
            </Button>
          </div>
        )}
      </form>
    </PageTemplate>
  );
}
