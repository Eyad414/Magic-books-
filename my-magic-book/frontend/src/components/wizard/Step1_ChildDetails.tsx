import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { User, Baby, ChevronLeft } from 'lucide-react';

// Props Interface: Defines the properties this component expects to receive from its parent (CreateStory.tsx)
interface Props { onNext: () => void; }

export default function Step1_ChildDetails({ onNext }: Props) { // To move to the next page in the steps
  const { progress, setChildDetails } = useStoryProgress(); // To save User Choices in the steps
  
  // Local State: Manages the form inputs specifically for this step before saving them globally
  const [form, setForm] = useState({
    childName: progress.childDetails.childName || '',
    childAge: progress.childDetails.childAge || '3-5',
    childGender: progress.childDetails.childGender || 'male' as 'male' | 'female',
    childPhotoUrl: progress.childDetails.childPhotoUrl || '',
  });
  
  // Local State: Manages validation error strings for each input field
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Local State: Tracks if the user wants to add a photo
  const [wantsPhoto, setWantsPhoto] = useState(!!progress.childDetails.childPhotoUrl);

  // Function: Validates that all required fields are filled correctly before proceeding
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.childName.trim()) errs.childName = 'يرجى إدخال اسم الطفل';
    if (!form.childAge) errs.childAge = 'يرجى تحديد الفئة العمرية';
    if (wantsPhoto && !form.childPhotoUrl) errs.childPhotoUrl = 'يرجى رفع صورة طفلك للمتابعة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Function: Called when user clicks the "Next" button. It validates, saves to global context, and triggers the next step
  const handleNext = () => {
    if (!validate()) return;
    setChildDetails(form);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">👶</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">أخبرنا عن طفلك</h2>
        <p className="font-arabic text-white/50 text-sm">هذه المعلومات ستجعل القصة مخصصة تماماً لطفلك</p>
      </div>

      {/* Name: Input field to capture the hero's name which will be used by AI in the story */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-2">
          <User className="w-4 h-4 inline ml-1 text-gold-500" />
          اسم طفلك *
        </label>
        <input
          type="text"
          id="child-name-input"
          className="magic-input"
          placeholder="مثال: محمد، سارة، ريم..."
          value={form.childName}
          onChange={(e) => setForm({ ...form, childName: e.target.value })}
          maxLength={30}
        />
        {errors.childName && <p className="text-red-400 text-xs font-arabic mt-1">{errors.childName}</p>}
      </div>

      {/* Age: Select age group so the AI adjusts language complexity and vocabulary */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">
          <Baby className="w-4 h-4 inline ml-1 text-gold-500" />
          العمر المناسب
        </label>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { id: '1-3', label: '١-٣ سنوات', emoji: '👶' },
            { id: '3-5', label: '٣-٥ سنوات', emoji: '🧸' },
            { id: '5-8', label: '٥-٨ سنوات', emoji: '🎠' },
            { id: '8-10', label: '٨-١٠ سنوات', emoji: '🏆' },
          ].map((age) => (
            <button
              key={age.id}
              type="button"
              onClick={() => setForm({ ...form, childAge: age.id })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                form.childAge === age.id ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              <span className="text-xl sm:text-2xl">{age.emoji}</span>
              <span className="font-arabic font-bold text-xs sm:text-sm">{age.label}</span>
            </button>
          ))}
        </div>
        {errors.childAge && <p className="text-red-400 text-xs font-arabic mt-1">{errors.childAge}</p>}
      </div>

      {/* Gender: Determines the pronouns (he/she) and character styling in the generated story */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">جنس طفلك</label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'male', emoji: '👦', label: 'ولد' },
            { value: 'female', emoji: '👧', label: 'بنت' },
          ].map((option) => (
            <button
              key={option.value}
              id={`gender-${option.value}`}
              type="button"
              onClick={() => setForm({ ...form, childGender: option.value as 'male' | 'female' })}
              className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 ${
                form.childGender === option.value
                  ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                  : 'border-white/10 text-white/50 hover:border-white/30'
              }`}
            >
              <span className="text-4xl">{option.emoji}</span>
              <span className="font-arabic font-bold">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Photo Upload: Conditional rendering based on user choice */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">هل ترغب بإضافة صورة لطفلك؟ (اختياري)</label>
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => setWantsPhoto(true)}
            className={`flex-1 py-2 rounded-xl border-2 transition-all font-arabic text-sm ${wantsPhoto ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'}`}
          >
            نعم، أضف صورة 📸
          </button>
          <button
            type="button"
            onClick={() => {
              setWantsPhoto(false);
              setForm({ ...form, childPhotoUrl: '' });
            }}
            className={`flex-1 py-2 rounded-xl border-2 transition-all font-arabic text-sm ${!wantsPhoto ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'}`}
          >
            لا، تخطى ذلك
          </button>
        </div>

        {wantsPhoto && (
          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 hover:border-gold-500/30 transition-all cursor-pointer relative animate-fade-in">
             <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                if (e.target.files?.[0]) {
                   setForm({...form, childPhotoUrl: URL.createObjectURL(e.target.files[0])});
                }
             }} />
             {form.childPhotoUrl ? (
                <img src={form.childPhotoUrl} alt="Child" className="w-24 h-24 object-cover mx-auto rounded-full border-4 border-gold-500 shadow-gold-glow" />
             ) : (
                <div className="flex flex-col items-center">
                   <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center mb-2">
                      <span className="text-2xl">📸</span>
                   </div>
                   <span className="font-arabic text-sm text-gold-500">ارفع صورة طفلك هنا</span>
                   <span className="font-arabic text-xs text-white/40 mt-1">سيتم تحويلها لكرتون بضغطة زر</span>
                </div>
             )}
          </div>
        )}
        {errors.childPhotoUrl && <p className="text-red-400 text-xs font-arabic mt-2">{errors.childPhotoUrl}</p>}
      </div>

      {/* Preview */}
      {form.childName && (
        <div className="p-4 rounded-xl bg-magic-500/10 border border-magic-500/20">
          <p className="font-arabic text-white/70 text-sm text-center">
            ✨ سيكون بطل قصتنا: <strong className="text-gold-500">{form.childName}</strong>،{' '}
            العمر {form.childAge}، {form.childGender === 'male' ? 'ولد شجاع 👦' : 'بنت رائعة 👧'}
          </p>
        </div>
      )}

      <MagicButton
        id="step1-next-btn"
        fullWidth
        size="lg"
        onClick={handleNext}
        icon={<ChevronLeft className="w-5 h-5" />}
      >
        التالي — اختر موضوع القصة
      </MagicButton>
    </div>
  );
}
