import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Brain,
  Shield,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  FileText,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  BookOpen
} from 'lucide-react';

export default function ScenarioDetails() {
  const [expandedScenario, setExpandedScenario] = useState<number | null>(null);

  const toggleScenario = (scenarioId: number) => {
    setExpandedScenario(expandedScenario === scenarioId ? null : scenarioId);
  };

  const scenarios = [
    {
      id: 1,
      name: "Benefit Outlier Detection",
      category: "Financial Fraud Detection",
      riskLevel: "High",
      icon: TrendingUp,
      description: "This scenario finds healthcare claims where the billed amount is much higher than normal for similar services.",
      explanation: "When a healthcare provider bills an insurance company, the amount should be reasonable compared to what other providers charge for the same service in the same area. This scenario looks for claims that are unusually expensive - like a doctor charging $5,000 for a basic check-up when most doctors charge $200. This could mean the provider is trying to overcharge, made a billing mistake, or is committing fraud. The system compares each bill against thousands of similar bills to spot the ones that don't make sense.",
      whyItMatters: "This protects insurance companies and patients from paying too much for healthcare services. It also helps catch dishonest providers who might be trying to steal money through fake or inflated bills.",
      example: "Dr. Smith's clinic bills $8,000 for a routine blood test, but every other clinic in the city charges between $50-$150 for the same test. This would be flagged as suspicious."
    },    {

      id: 2,
      name: "Chemotherapy Gap Detection",
      category: "Medical Treatment Monitoring",
      riskLevel: "High",
      icon: Activity,
      description: "This scenario monitors chemotherapy treatment schedules to ensure they follow proper medical protocols.",
      explanation: "Chemotherapy is a serious cancer treatment that must be given on a specific schedule for it to work properly and be safe for the patient. Doctors follow strict medical guidelines about how often these treatments should be given - usually every 2-4 weeks. This scenario looks for patients whose chemotherapy treatments have unusual gaps or timing. If there's a 6-month gap between treatments, or if treatments are happening too close together (like every day), something might be wrong. This could mean the treatments aren't really happening, or the provider is billing for fake treatments.",
      whyItMatters: "This ensures cancer patients get proper care and prevents billing for chemotherapy treatments that never actually happened. It also protects patients from dangerous treatment schedules.",
      example: "A cancer patient's records show chemotherapy every day for a week, then nothing for 8 months. Real chemotherapy doesn't work this way - it should be more regular, like every 3 weeks."
    },
    {
      id: 3,
      name: "Cross-Country Fraud Detection",
      category: "Geographic Impossibility",
      riskLevel: "Critical",
      icon: MapPin,
      description: "This scenario finds patients who appear to be getting medical treatment in multiple countries at the same time.",
      explanation: "A person cannot be in two places at once. If someone is having surgery in Germany on Monday, they cannot also be getting physical therapy in Japan on the same Monday. This scenario looks for patients whose medical records show them receiving treatment in different countries on the same day or overlapping days. This is physically impossible and usually means someone is using stolen identity information to get fake medical treatments, or providers are billing for treatments that never happened.",
      whyItMatters: "This catches serious fraud where criminals use stolen identities to get expensive medical treatments, or where fake medical bills are being submitted from multiple countries.",
      example: "Patient John Doe appears to have heart surgery in London on March 15th while also getting dental work in New York on March 15th. Since he can't be in both places, one of these treatments is fake."
    },
    {
      id: 4,
      name: "Sunday Claims Analysis",
      category: "Unusual Scheduling",
      riskLevel: "Medium",
      icon: Calendar,
      description: "This scenario flags medical treatments that are claimed to happen on Sundays when most medical facilities are closed.",
      explanation: "Most doctors' offices, clinics, and medical facilities are closed on Sundays, except for emergency rooms and urgent care. If a provider bills for routine services like regular check-ups, dental cleanings, or elective surgeries on Sundays, this is suspicious. While some legitimate medical care does happen on Sundays (emergencies, hospital care), routine outpatient services usually don't. This scenario helps identify bills for services that probably didn't actually happen on the claimed date.",
      whyItMatters: "This helps catch providers who might be backdating their bills or billing for services that didn't actually occur when they claimed.",
      example: "A dental office bills for 20 routine teeth cleanings on Sunday, but dental offices are typically closed on Sundays. These cleanings probably happened on a different day, or maybe not at all."
    },  
  {
      id: 5,
      name: "Multiple Claims Same Invoice",
      category: "Duplicate Billing",
      riskLevel: "High",
      icon: FileText,
      description: "This scenario catches providers who use the same invoice number for multiple different insurance claims.",
      explanation: "Every medical bill should have a unique invoice number, like a receipt number at a store. If a provider uses the same invoice number for different patients or different services, this is suspicious. It's like using the same receipt to return multiple different items to a store. This usually means the provider is trying to get paid multiple times for the same service, or is submitting fake bills. Each real medical service should have its own unique invoice number.",
      whyItMatters: "This prevents providers from getting paid multiple times for the same service and catches systematic billing fraud where fake invoices are being created.",
      example: "Dr. Johnson uses invoice number #12345 for both Mary's surgery and Tom's medication prescription. Each service should have its own unique invoice number."
    },
    {
      id: 6,
      name: "Inpatient/Outpatient Same Date",
      category: "Medical Impossibility",
      riskLevel: "High",
      icon: Activity,
      description: "This scenario finds patients who appear to be both admitted to a hospital and visiting an outpatient clinic on the same day.",
      explanation: "A patient cannot be in two places at once. If someone is admitted to a hospital (inpatient care), they are staying overnight in the hospital and cannot leave to visit a clinic (outpatient care) on the same day. This scenario looks for patients whose records show them both staying in a hospital and visiting a separate clinic on the same day. This is medically impossible and usually means someone made a billing error or is submitting fake claims.",
      whyItMatters: "This catches impossible medical scenarios and prevents payment for services that couldn't have actually been provided.",
      example: "Patient Sarah appears to be admitted to City Hospital for surgery on Tuesday while also having an outpatient appointment at Downtown Clinic on the same Tuesday. She can't be in both places."
    },
    {
      id: 7,
      name: "Provider Multi-Country",
      category: "Geographic Fraud",
      riskLevel: "Medium",
      icon: MapPin,
      description: "This scenario flags small healthcare providers that appear to be operating in many different countries.",
      explanation: "Most healthcare providers operate in one country or region. A small clinic or individual doctor usually doesn't have offices in multiple countries around the world. This scenario looks for providers who appear to be billing from many different countries (more than 3). This could mean the provider information is being used fraudulently, or fake providers are being created using stolen credentials. Large international hospital chains are excluded from this check since they legitimately operate globally.",
      whyItMatters: "This helps identify fake provider networks and prevents payments to non-existent healthcare facilities operating under stolen provider credentials.",
      example: "ABC Family Clinic appears to provide services in the United States, Germany, Japan, and Brazil. A small family clinic shouldn't be operating in so many different countries."
    },   
 {
      id: 8,
      name: "Multiple Provider Same Date",
      category: "Unrealistic Scheduling",
      riskLevel: "Medium",
      icon: Users,
      description: "This scenario finds patients who visit an unusually high number of different doctors on the same day.",
      explanation: "While it's possible for a patient to see multiple doctors in one day (like visiting a specialist after seeing their regular doctor), seeing more than 2-3 different providers in a single day is unusual and difficult to accomplish. This scenario looks for patients who appear to visit many different healthcare providers (more than 2) on the same day. This could indicate coordination fraud where multiple providers are working together to submit fake claims, or someone is using a patient's identity to bill for services that didn't happen.",
      whyItMatters: "This helps identify unrealistic treatment schedules and potential coordination between multiple providers to commit fraud.",
      example: "Patient Mike appears to visit a heart doctor, eye doctor, foot doctor, and dentist all on the same Monday. This would be very difficult to schedule and complete in one day."
    },
    {
      id: 9,
      name: "Member Multi-Currency",
      category: "International Fraud Pattern",
      riskLevel: "Medium",
      icon: DollarSign,
      description: "This scenario flags patients whose medical bills appear in many different currencies from different countries.",
      explanation: "Most people receive healthcare in their home country and pay in their local currency. If a patient's medical bills show up in many different currencies (like US Dollars, Euros, and Japanese Yen), this suggests they're getting treatment in multiple countries. While some people do travel for medical care, having bills in 3 or more different currencies is unusual and could indicate that someone's identity is being used fraudulently in multiple countries, or that fake international claims are being submitted.",
      whyItMatters: "This helps catch international fraud schemes where patient identities are stolen and used to submit fake claims from multiple countries.",
      example: "Patient Lisa has medical bills in US Dollars, British Pounds, and Japanese Yen all in the same month, suggesting treatment in the US, UK, and Japan simultaneously."
    },
    {
      id: 10,
      name: "Gender-Procedure Mismatch",
      category: "Medical Impossibility",
      riskLevel: "High",
      icon: Stethoscope,
      description: "This scenario catches medical procedures that are biologically impossible for the patient's gender.",
      explanation: "Some medical procedures can only be performed on certain genders due to biological differences. For example, only women can have gynecological exams or mammograms, and only men can have prostate exams. This scenario looks for claims where the wrong gender is billed for gender-specific procedures. This usually indicates a data entry error, identity mix-up, or fraudulent billing where someone is submitting fake claims without paying attention to basic medical facts.",
      whyItMatters: "This catches obvious billing errors and fraud attempts where basic medical knowledge is ignored, preventing payment for impossible procedures.",
      example: "A male patient is billed for a mammogram (breast cancer screening) or a female patient is billed for prostate surgery. These procedures are biologically impossible for these genders."
    },   
 {
      id: 11,
      name: "Early Invoice Date",
      category: "Timeline Fraud",
      riskLevel: "High",
      icon: Clock,
      description: "This scenario finds bills that are dated before the medical treatment actually happened.",
      explanation: "In normal business, you can't bill someone for a service before you provide it. If a doctor bills you on January 1st for a surgery that happens on January 15th, something is wrong with the billing system or someone is trying to manipulate the dates. This scenario looks for medical bills where the invoice date comes before the treatment date. This could mean the billing system has errors, someone is backdating invoices, or fake bills are being created without attention to logical timelines.",
      whyItMatters: "This catches billing system problems and prevents payment for claims with impossible timelines that might be fraudulent.",
      example: "A hospital sends a bill dated March 1st for a surgery that happened on March 20th. You can't bill for something before it happens."
    },
    {
      id: 12,
      name: "Adult Pediatric Diagnosis",
      category: "Age-Inappropriate Medical Coding",
      riskLevel: "High",
      icon: Stethoscope,
      description: "This scenario finds adult patients who are diagnosed with medical conditions that only happen to babies and children.",
      explanation: "Some medical conditions only occur in babies, children, or during birth. For example, 'failure to thrive in newborns' or 'birth complications' can only happen to babies, not adults. This scenario looks for adult patients (18 years or older) who are being diagnosed with these child-only or birth-related conditions. This usually means there's a mistake in the medical coding, someone mixed up patient records, or fake diagnoses are being used to justify treatments or billing.",
      whyItMatters: "This prevents payment for medically impossible diagnoses and helps catch coding errors or fraud where inappropriate diagnoses are used.",
      example: "A 45-year-old man is diagnosed with 'premature birth complications' or 'newborn feeding difficulties' - conditions that can only happen to babies."
    },
    {
      id: 13,
      name: "Multiple Payee Types",
      category: "Payment Inconsistency",
      riskLevel: "Medium",
      icon: Users,
      description: "This scenario flags cases where the same patient has different payment arrangements on the same day.",
      explanation: "When you go to the doctor, there should be a consistent way that the bills get paid - either the insurance pays the doctor directly, or the insurance pays you and you pay the doctor. This scenario looks for patients who have different payment arrangements for medical services on the same day. For example, some bills are paid directly to the doctor while other bills from the same day are paid to the patient. This inconsistency could indicate billing manipulation or attempts to get paid twice for the same services.",
      whyItMatters: "This helps ensure consistent billing practices and prevents manipulation of payment systems to get extra money.",
      example: "On the same day, Mary's surgery bill is paid directly to the hospital, but her medication bill is paid to Mary herself, creating an inconsistent payment pattern."
    },    
{
      id: 14,
      name: "Excessive Diagnoses",
      category: "Diagnosis Padding",
      riskLevel: "Medium",
      icon: FileText,
      description: "This scenario finds patients who receive an unusually high number of different diagnoses on the same day.",
      explanation: "When you visit a doctor, you typically get diagnosed with 1-3 medical conditions related to why you came in. Getting 8 or more completely different diagnoses in a single visit is very unusual. This scenario looks for patients who receive many unrelated diagnoses during one appointment. This could mean the doctor is 'padding' the diagnoses to make the visit seem more complex and justify higher billing, or there are errors in the medical records. Real medical visits usually focus on related health issues, not many random unconnected problems.",
      whyItMatters: "This prevents doctors from artificially inflating their bills by adding unnecessary diagnoses and ensures patients aren't charged for excessive medical complexity.",
      example: "During a visit for a sore throat, a patient also gets diagnosed with back pain, foot problems, eye issues, skin conditions, and 6 other unrelated problems all in the same 30-minute appointment."
    },
    {
      id: 15,
      name: "Hospital Benefits from Non-Hospital Providers",
      category: "Provider Type Fraud",
      riskLevel: "High",
      icon: Building2,
      description: "This scenario catches small clinics or doctors' offices that bill using hospital-level benefit codes.",
      explanation: "Different types of healthcare facilities have different billing codes. Hospitals can charge more for services because they have higher overhead costs (24/7 staff, emergency equipment, etc.). Small clinics and doctors' offices should use their own billing codes, not hospital codes. This scenario looks for non-hospital providers (like small clinics) who are using hospital billing codes to get paid at higher hospital rates. This is like a small corner store trying to charge luxury hotel prices for the same items.",
      whyItMatters: "This prevents small providers from overcharging by pretending to be hospitals and ensures fair pricing based on the actual type of facility.",
      example: "A small family clinic bills for 'hospital accommodation' and 'emergency room services' when they're just a regular clinic without hospital facilities."
    },
    {
      id: 16,
      name: "Paid Claims from Veterinary Providers",
      category: "Cross-Species Billing",
      riskLevel: "High",
      icon: AlertTriangle,
      description: "This scenario finds veterinary clinics (animal doctors) that are receiving payments for human healthcare.",
      explanation: "Veterinarians treat animals, not people. Human health insurance should never pay veterinary clinics for human medical care. This scenario looks for specific veterinary provider IDs that are receiving payments from human health insurance plans. This is a clear sign of fraud - either someone is using veterinary facilities to submit fake human medical claims, or there's been a major error in the billing system. Veterinary medicine and human medicine are completely separate.",
      whyItMatters: "This prevents human health insurance money from being paid to animal doctors and catches obvious fraud attempts.",
      example: "Happy Pets Veterinary Clinic receives payment from human health insurance for treating a person's broken leg. Veterinarians don't treat people."
    },  
  {
      id: 17,
      name: "Multiple MRI/CT Same Day",
      category: "Expensive Procedure Overuse",
      riskLevel: "Medium",
      icon: Activity,
      description: "This scenario flags patients who receive multiple expensive imaging scans (MRI or CT) on the same day for the same problem.",
      explanation: "MRI and CT scans are expensive medical tests that take detailed pictures inside your body. Normally, if you have back pain, one MRI scan is enough to see what's wrong. Getting multiple MRI scans on the same day for the same back pain problem is unusual and expensive. This scenario looks for patients who receive several of these expensive scans on the same day for the same medical condition. This could mean the provider is trying to increase their income by ordering unnecessary tests, or there are billing errors.",
      whyItMatters: "This prevents unnecessary medical expenses and catches providers who might be ordering too many expensive tests to increase their profits.",
      example: "A patient with knee pain gets 3 different MRI scans of the same knee on the same day. One MRI should be enough to diagnose the knee problem."
    },
    {
      id: 18,
      name: "Placeholder Scenario",
      category: "Future Development",
      riskLevel: "Low",
      icon: Info,
      description: "This is a reserved space for future fraud detection methods as new patterns are discovered.",
      explanation: "Healthcare fraud is constantly evolving, with criminals finding new ways to steal money from insurance systems. This placeholder scenario is like an empty slot that can be filled with new fraud detection methods as they are developed. As fraud experts discover new patterns of dishonest behavior, new detection scenarios can be added here. This ensures the system can grow and adapt to catch new types of fraud that haven't been invented yet.",
      whyItMatters: "This keeps the fraud detection system flexible and ready to adapt to new types of healthcare fraud as they emerge.",
      example: "In the future, this might include AI-powered detection of fake medical records or blockchain verification of treatment authenticity."
    },
    {
      id: 19,
      name: "Multiple Screenings Same Year",
      category: "Preventive Care Overuse",
      riskLevel: "Medium",
      icon: Calendar,
      description: "This scenario finds patients who receive the same preventive health screening multiple times in one year.",
      explanation: "Preventive health screenings (like mammograms, colonoscopies, or annual check-ups) are designed to be done once per year or even less frequently. Insurance companies typically cover these screenings once per year because doing them more often isn't medically necessary and is expensive. This scenario looks for patients who receive the same type of screening multiple times within 12 months. This could mean providers are billing for unnecessary repeat screenings to increase their income, or there are errors in the scheduling system.",
      whyItMatters: "This prevents waste of healthcare resources and catches providers who might be performing unnecessary repeat screenings for profit.",
      example: "A patient receives 4 mammograms in the same year when medical guidelines recommend one mammogram per year for most women."
    }, 
   {
      id: 20,
      name: "Dialysis Without Kidney Diagnosis",
      category: "Medical Necessity Fraud",
      riskLevel: "High",
      icon: Stethoscope,
      description: "This scenario finds patients receiving dialysis treatment without having kidney disease or kidney problems.",
      explanation: "Dialysis is a very specific and expensive medical treatment that cleans your blood when your kidneys don't work properly. This treatment is only needed by people with kidney disease, kidney failure, or serious kidney problems. This scenario looks for patients who are receiving dialysis treatment but don't have any kidney-related diagnoses in their medical records. This is like getting heart surgery when you don't have heart problems - it doesn't make medical sense and could indicate fake treatments or billing errors.",
      whyItMatters: "This ensures expensive dialysis treatments are only given to patients who actually need them and prevents payment for medically unnecessary procedures.",
      example: "A patient receives dialysis treatment but their medical records only show a broken arm and common cold - no kidney problems that would require dialysis."
    },
    {
      id: 21,
      name: "Unusual Dentistry Claims",
      category: "Specialty Mismatch",
      riskLevel: "Medium",
      icon: Stethoscope,
      description: "This scenario flags dental providers who bill for dental work but use non-dental medical diagnoses.",
      explanation: "When you go to the dentist, the problems they treat should be related to your teeth, gums, or mouth. Dentists should use dental diagnosis codes (like 'tooth decay' or 'gum disease') when they bill for their services. This scenario looks for dental providers who are using non-dental diagnoses (like 'heart disease' or 'broken leg') to justify their dental treatments. This doesn't make medical sense - a dentist shouldn't be treating heart problems, and heart problems don't require dental work.",
      whyItMatters: "This ensures dental providers use appropriate medical codes for their services and prevents billing irregularities in dental care.",
      example: "A dentist bills for tooth cleaning but uses a diagnosis code for diabetes or heart disease instead of a dental problem like cavities or gum disease."
    },
    {
      id: 22,
      name: "Invalid Migraine Claims",
      category: "Treatment Code Mismatch",
      riskLevel: "Medium",
      icon: Brain,
      description: "This scenario finds migraine diagnoses that are paired with inappropriate treatment billing codes.",
      explanation: "When someone is diagnosed with migraines (severe headaches), the treatment should match the diagnosis. Migraine treatments typically include pain medication, neurology consultations, or headache management services. This scenario looks for patients diagnosed with migraines but billed for completely unrelated treatments (like surgery or physical therapy) that don't make sense for headache treatment. This could indicate billing errors where the wrong treatment codes are used, or attempts to use migraine diagnoses to justify expensive unrelated treatments.",
      whyItMatters: "This ensures migraine patients receive appropriate treatments and prevents misuse of migraine diagnoses to justify unrelated expensive procedures.",
      example: "A patient diagnosed with migraines is billed for major surgery or physical therapy instead of headache medication or neurology consultation."
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Financial Fraud Detection': 'bg-red-50 text-red-700',
      'Medical Treatment Monitoring': 'bg-orange-50 text-orange-700',
      'Geographic Impossibility': 'bg-purple-50 text-purple-700',
      'Unusual Scheduling': 'bg-blue-50 text-blue-700',
      'Duplicate Billing': 'bg-green-50 text-green-700',
      'Medical Impossibility': 'bg-pink-50 text-pink-700',
      'Geographic Fraud': 'bg-indigo-50 text-indigo-700',
      'Unrealistic Scheduling': 'bg-teal-50 text-teal-700',
      'International Fraud Pattern': 'bg-cyan-50 text-cyan-700',
      'Timeline Fraud': 'bg-amber-50 text-amber-700',
      'Age-Inappropriate Medical Coding': 'bg-lime-50 text-lime-700',
      'Payment Inconsistency': 'bg-emerald-50 text-emerald-700',
      'Diagnosis Padding': 'bg-sky-50 text-sky-700',
      'Provider Type Fraud': 'bg-violet-50 text-violet-700',
      'Cross-Species Billing': 'bg-fuchsia-50 text-fuchsia-700',
      'Expensive Procedure Overuse': 'bg-rose-50 text-rose-700',
      'Future Development': 'bg-slate-50 text-slate-700',
      'Preventive Care Overuse': 'bg-stone-50 text-stone-700',
      'Medical Necessity Fraud': 'bg-red-50 text-red-700',
      'Specialty Mismatch': 'bg-orange-50 text-orange-700',
      'Treatment Code Mismatch': 'bg-purple-50 text-purple-700'
    };
    return colors[category] || 'bg-gray-50 text-gray-700';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Healthcare Fraud Detection Scenarios</h1>
        <p className="text-lg text-gray-600">
          Comprehensive explanations of all 22 fraud detection scenarios in plain English
        </p>
      </div>

      <div className="grid gap-6">
        {scenarios.map((scenario) => {
          const IconComponent = scenario.icon;
          const isExpanded = expandedScenario === scenario.id;
          
          return (
            <Card key={scenario.id} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold">
                        Scenario {scenario.id}: {scenario.name}
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge className={getCategoryColor(scenario.category)}>
                          {scenario.category}
                        </Badge>
                        <Badge className={getRiskColor(scenario.riskLevel)}>
                          {scenario.riskLevel} Risk
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleScenario(scenario.id)}
                    className="ml-4"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <CardDescription className="text-base mt-2">
                  {scenario.description}
                </CardDescription>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        How This Works (In Simple Terms)
                      </h4>
                      <p className="text-blue-800 leading-relaxed">
                        {scenario.explanation}
                      </p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                        <Shield className="h-4 w-4 mr-2" />
                        Why This Matters
                      </h4>
                      <p className="text-green-800 leading-relaxed">
                        {scenario.whyItMatters}
                      </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                      <h4 className="font-semibold text-amber-900 mb-2 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Real-World Example
                      </h4>
                      <p className="text-amber-800 leading-relaxed">
                        {scenario.example}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}