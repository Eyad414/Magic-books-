import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { User, Baby, ChevronLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { uploadApi } from '../../api/uploadApi';

// Props Interface: Defines the properties this component expects to receive from its parent (CreateStory.tsx)
interface Props { onNext: () => void; }

export default function Step1_ChildDetails({ onNext }: Props) { // To move to the next page in the steps
  const { progress, setChildDetails } = useStoryProgress(); // To save User Choices in the steps
  const { t } = useTranslation();

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

  // Local State: holds the File picked by the user (null once it's been uploaded to GCS)
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(form.childPhotoUrl);
  const [isUploading, setIsUploading] = useState(false);

  // Function: Validates that all required fields are filled correctly before proceeding
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.childName.trim()) errs.childName = t('step1.err_child_name');
    if (!form.childAge) errs.childAge = t('step1.err_child_age');
    if (wantsPhoto && !pendingFile && !form.childPhotoUrl) errs.childPhotoUrl = t('step1.err_photo');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Function: Called when user clicks the "Next" button. It validates, uploads any pending photo, saves to global context, and triggers the next step.
  const handleNext = async () => {
    if (!validate()) return;

    let nextForm = form;
    if (wantsPhoto && pendingFile) {
      setIsUploading(true);
      try {
        const { gcsUri } = await uploadApi.childPhoto(pendingFile);
        nextForm = { ...form, childPhotoUrl: gcsUri };
        setForm(nextForm);
        setPendingFile(null);
      } catch (err: any) {
        setErrors({ childPhotoUrl: err?.response?.data?.message || err.message || 'Upload failed' });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    setChildDetails(nextForm);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">👶</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step1.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step1.desc')}</p>
      </div>

      {/* Name: Input field to capture the hero's name which will be used by AI in the story */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-2">
          <User className="w-4 h-4 inline ml-1 text-gold-500" />
          {t('step1.child_name_label')}
        </label>
        <input
          type="text"
          id="child-name-input"
          className="magic-input"
          placeholder={t('step1.child_name_placeholder')}
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
          {t('step1.child_age_label')}
        </label>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            { id: '1-3', label: t('step1.age_1_3'), emoji: '👶' },
            { id: '3-5', label: t('step1.age_3_5'), emoji: '🧸' },
            { id: '5-8', label: t('step1.age_5_8'), emoji: '🎠' },
            { id: '8-10', label: t('step1.age_8_10'), emoji: '🏆' },
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
        <label className="block font-arabic text-white/80 text-sm mb-3">{t('step1.child_gender_label')}</label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: 'male', emoji: '👦', label: t('step1.gender_male') },
            { value: 'female', emoji: '👧', label: t('step1.gender_female') },
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
        <label className="block font-arabic text-white/80 text-sm mb-3">{t('step1.photo_label')}</label>
        <div className="flex gap-4 mb-4">
          <button
            type="button"
            onClick={() => setWantsPhoto(true)}
            className={`flex-1 py-2 rounded-xl border-2 transition-all font-arabic text-sm ${wantsPhoto ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'}`}
          >
            {t('step1.photo_yes')}
          </button>
          <button
            type="button"
            onClick={() => {
              setWantsPhoto(false);
              setForm({ ...form, childPhotoUrl: '' });
              setPendingFile(null);
              setPreviewUrl('');
            }}
            className={`flex-1 py-2 rounded-xl border-2 transition-all font-arabic text-sm ${!wantsPhoto ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'}`}
          >
            {t('step1.photo_no')}
          </button>
        </div>

        {wantsPhoto && (
          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:bg-white/5 hover:border-gold-500/30 transition-all cursor-pointer relative animate-fade-in">
            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPendingFile(file);
                  setPreviewUrl(URL.createObjectURL(file));
                  setErrors((prev) => ({ ...prev, childPhotoUrl: '' }));
                }
            }} />
            {previewUrl ? (
                <img src={previewUrl} alt="Child" className="w-24 h-24 object-cover mx-auto rounded-full border-4 border-gold-500 shadow-gold-glow" />
            ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center mb-2">
                      <span className="text-2xl">📸</span>
                  </div>
                  <span className="font-arabic text-sm text-gold-500">{t('step1.upload_photo')}</span>
                  <span className="font-arabic text-xs text-white/40 mt-1">{t('step1.photo_hint')}</span>
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
            {form.childGender === 'male'
              ? <>{t('step1.preview_male')}<strong className="text-gold-500">{form.childName}</strong>{t('step1.preview_male_suffix')}</>
              : <>{t('step1.preview_female')}<strong className="text-gold-500">{form.childName}</strong>{t('step1.preview_female_suffix')}</>
            }
          </p>
        </div>
      )}

      <MagicButton
        id="step1-next-btn"
        fullWidth
        size="lg"
        onClick={handleNext}
        disabled={isUploading}
        icon={isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronLeft className="w-5 h-5 nav-icon" />}
      >
        {isUploading ? t('step1.uploading', 'جاري رفع الصورة...') : t('step1.next_btn')}
      </MagicButton>
    </div>
  );
}
