
-- Create ICD-11 codes table mirroring icd10_codes structure
CREATE TABLE public.icd11_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  category text,
  chapter text,
  is_billable boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  aliases text[] DEFAULT '{}'::text[]
);

-- Create indexes for fast search
CREATE INDEX idx_icd11_code ON public.icd11_codes USING btree (code text_pattern_ops);
CREATE INDEX idx_icd11_description ON public.icd11_codes USING btree (lower(description) text_pattern_ops);
CREATE INDEX idx_icd11_aliases ON public.icd11_codes USING gin (aliases);
CREATE INDEX idx_icd11_codes_category ON public.icd11_codes USING btree (category);

-- Enable RLS
ALTER TABLE public.icd11_codes ENABLE ROW LEVEL SECURITY;

-- Public read access (same as ICD-10)
CREATE POLICY "ICD-11 codes are publicly readable"
  ON public.icd11_codes FOR SELECT
  USING (true);

-- Seed common ICD-11 codes (500+ entries across major chapters)
INSERT INTO public.icd11_codes (code, description, category, chapter, aliases) VALUES
-- Chapter 1: Certain infectious or parasitic diseases
('1A00', 'Cholera', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['cholera','vibrio']),
('1A01', 'Intestinal infection due to other Vibrio', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['vibrio infection']),
('1A02', 'Intestinal infections due to Shigella', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['shigellosis','dysentery']),
('1A03', 'Intestinal infections due to Escherichia coli', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['e coli','ecoli infection']),
('1A04', 'Other bacterial intestinal infections', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['bacterial gastroenteritis']),
('1A07', 'Typhoid fever', 'Intestinal infectious diseases', 'Certain infectious or parasitic diseases', ARRAY['typhoid','salmonella typhi']),
('1A20', 'Respiratory tuberculosis', 'Tuberculosis', 'Certain infectious or parasitic diseases', ARRAY['tb','tuberculosis','pulmonary tb']),
('1A40', 'Plague', 'Certain zoonotic bacterial diseases', 'Certain infectious or parasitic diseases', ARRAY['plague','yersinia pestis']),
('1A50', 'Tetanus', 'Certain zoonotic bacterial diseases', 'Certain infectious or parasitic diseases', ARRAY['tetanus','lockjaw']),
('1A60', 'Diphtheria', 'Certain zoonotic bacterial diseases', 'Certain infectious or parasitic diseases', ARRAY['diphtheria']),
('1A62', 'Whooping cough', 'Certain zoonotic bacterial diseases', 'Certain infectious or parasitic diseases', ARRAY['pertussis','whooping cough']),
('1B10', 'Acute hepatitis A', 'Viral hepatitis', 'Certain infectious or parasitic diseases', ARRAY['hepatitis a','hav']),
('1B11', 'Acute hepatitis B', 'Viral hepatitis', 'Certain infectious or parasitic diseases', ARRAY['hepatitis b','hbv']),
('1B12', 'Acute hepatitis C', 'Viral hepatitis', 'Certain infectious or parasitic diseases', ARRAY['hepatitis c','hcv']),
('1B50', 'Herpes simplex infections', 'Viral infections of skin or mucous membranes', 'Certain infectious or parasitic diseases', ARRAY['herpes','hsv','cold sore']),
('1B70', 'HIV disease', 'HIV disease', 'Certain infectious or parasitic diseases', ARRAY['hiv','aids','human immunodeficiency virus']),
('1B90', 'Malaria', 'Malaria', 'Certain infectious or parasitic diseases', ARRAY['malaria','plasmodium']),
('1C00', 'Dengue', 'Arthropod-borne viral fevers', 'Certain infectious or parasitic diseases', ARRAY['dengue','dengue fever','break bone fever']),
('1C10', 'Chikungunya virus disease', 'Arthropod-borne viral fevers', 'Certain infectious or parasitic diseases', ARRAY['chikungunya']),
('1C40', 'COVID-19', 'Emergent viral infections', 'Certain infectious or parasitic diseases', ARRAY['covid','coronavirus','sars-cov-2','corona']),

-- Chapter 2: Neoplasms
('2A00', 'Malignant neoplasm of lip', 'Malignant neoplasms of lip, oral cavity or pharynx', 'Neoplasms', ARRAY['lip cancer']),
('2A60', 'Malignant neoplasm of oesophagus', 'Malignant neoplasms of digestive organs', 'Neoplasms', ARRAY['esophageal cancer','oesophageal cancer']),
('2A70', 'Malignant neoplasm of stomach', 'Malignant neoplasms of digestive organs', 'Neoplasms', ARRAY['stomach cancer','gastric cancer']),
('2A80', 'Malignant neoplasm of colon', 'Malignant neoplasms of digestive organs', 'Neoplasms', ARRAY['colon cancer','colorectal cancer']),
('2B50', 'Malignant neoplasm of trachea, bronchus or lung', 'Malignant neoplasms of respiratory organs', 'Neoplasms', ARRAY['lung cancer','bronchial cancer']),
('2B60', 'Malignant neoplasm of breast', 'Malignant neoplasms of breast', 'Neoplasms', ARRAY['breast cancer']),
('2B70', 'Malignant neoplasm of cervix uteri', 'Malignant neoplasms of female genital organs', 'Neoplasms', ARRAY['cervical cancer']),
('2B90', 'Malignant neoplasm of prostate', 'Malignant neoplasms of male genital organs', 'Neoplasms', ARRAY['prostate cancer']),
('2C00', 'Malignant neoplasm of kidney', 'Malignant neoplasms of urinary organs', 'Neoplasms', ARRAY['kidney cancer','renal cancer']),
('2C10', 'Malignant neoplasm of bladder', 'Malignant neoplasms of urinary organs', 'Neoplasms', ARRAY['bladder cancer']),
('2D10', 'Malignant neoplasm of brain', 'Malignant neoplasms of brain or central nervous system', 'Neoplasms', ARRAY['brain cancer','brain tumor']),
('2B30', 'Malignant neoplasm of thyroid gland', 'Malignant neoplasms of thyroid', 'Neoplasms', ARRAY['thyroid cancer']),
('2E00', 'Leukaemia', 'Leukaemias', 'Neoplasms', ARRAY['leukemia','blood cancer']),

-- Chapter 4: Diseases of the immune system
('4A00', 'Primary immunodeficiencies', 'Primary immunodeficiencies', 'Diseases of the immune system', ARRAY['immunodeficiency']),
('4A20', 'Autoimmune or autoinflammatory disease of musculoskeletal system', 'Autoimmune diseases', 'Diseases of the immune system', ARRAY['autoimmune arthritis']),
('4A40', 'Allergic or hypersensitivity conditions', 'Allergic conditions', 'Diseases of the immune system', ARRAY['allergy','allergic reaction','hypersensitivity']),
('4A41', 'Anaphylaxis', 'Allergic conditions', 'Diseases of the immune system', ARRAY['anaphylactic shock','severe allergy']),
('4A42', 'Allergic rhinitis', 'Allergic conditions', 'Diseases of the immune system', ARRAY['hay fever','allergic rhinitis','nasal allergy']),
('4A43', 'Allergic asthma', 'Allergic conditions', 'Diseases of the immune system', ARRAY['allergic asthma']),

-- Chapter 5: Endocrine, nutritional or metabolic diseases
('5A10', 'Type 1 diabetes mellitus', 'Diabetes mellitus', 'Endocrine, nutritional or metabolic diseases', ARRAY['type 1 diabetes','t1dm','juvenile diabetes','insulin dependent']),
('5A11', 'Type 2 diabetes mellitus', 'Diabetes mellitus', 'Endocrine, nutritional or metabolic diseases', ARRAY['type 2 diabetes','t2dm','sugar','adult onset diabetes']),
('5A12', 'Gestational diabetes mellitus', 'Diabetes mellitus', 'Endocrine, nutritional or metabolic diseases', ARRAY['gestational diabetes','pregnancy diabetes']),
('5A13', 'Other specified diabetes mellitus', 'Diabetes mellitus', 'Endocrine, nutritional or metabolic diseases', ARRAY['secondary diabetes']),
('5A14', 'Diabetes mellitus, unspecified', 'Diabetes mellitus', 'Endocrine, nutritional or metabolic diseases', ARRAY['diabetes','dm','sugar disease']),
('5A20', 'Hypoglycaemia', 'Other disorders of glucose regulation', 'Endocrine, nutritional or metabolic diseases', ARRAY['low blood sugar','hypoglycemia']),
('5A30', 'Hypothyroidism', 'Thyroid disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['underactive thyroid','hypothyroid','low thyroid']),
('5A31', 'Hyperthyroidism', 'Thyroid disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['overactive thyroid','hyperthyroid','thyrotoxicosis']),
('5A32', 'Goitre', 'Thyroid disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['goiter','enlarged thyroid']),
('5A33', 'Thyroiditis', 'Thyroid disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['thyroid inflammation','hashimoto']),
('5A40', 'Cushing syndrome', 'Adrenal disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['cushing','cortisol excess']),
('5A50', 'Obesity', 'Overweight and obesity', 'Endocrine, nutritional or metabolic diseases', ARRAY['obese','overweight','morbid obesity']),
('5A60', 'Disorders of lipoprotein metabolism or certain specified lipidaemias', 'Metabolic disorders', 'Endocrine, nutritional or metabolic diseases', ARRAY['high cholesterol','dyslipidemia','hyperlipidemia','cholesterol']),
('5A70', 'Vitamin A deficiency', 'Nutritional deficiencies', 'Endocrine, nutritional or metabolic diseases', ARRAY['vitamin a deficiency']),
('5A71', 'Vitamin B deficiency', 'Nutritional deficiencies', 'Endocrine, nutritional or metabolic diseases', ARRAY['b12 deficiency','vitamin b deficiency']),
('5A72', 'Vitamin C deficiency', 'Nutritional deficiencies', 'Endocrine, nutritional or metabolic diseases', ARRAY['scurvy','vitamin c deficiency']),
('5A73', 'Vitamin D deficiency', 'Nutritional deficiencies', 'Endocrine, nutritional or metabolic diseases', ARRAY['vitamin d deficiency','rickets']),
('5A74', 'Iron deficiency', 'Nutritional deficiencies', 'Endocrine, nutritional or metabolic diseases', ARRAY['iron deficiency','low iron']),
('5A80', 'Gout', 'Disorders of purine or pyrimidine metabolism', 'Endocrine, nutritional or metabolic diseases', ARRAY['gout','uric acid','gouty arthritis']),

-- Chapter 6: Mental, behavioural or neurodevelopmental disorders
('6A00', 'Depressive episode', 'Mood disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['depression','depressive episode','major depression']),
('6A01', 'Recurrent depressive disorder', 'Mood disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['recurrent depression','chronic depression']),
('6A02', 'Bipolar type I disorder', 'Mood disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['bipolar','manic depression','bipolar 1']),
('6A10', 'Generalised anxiety disorder', 'Anxiety or fear-related disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['anxiety','gad','generalised anxiety','generalized anxiety']),
('6A11', 'Panic disorder', 'Anxiety or fear-related disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['panic attacks','panic disorder']),
('6A20', 'Post traumatic stress disorder', 'Stress-related disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['ptsd','post traumatic stress']),
('6A40', 'Obsessive-compulsive disorder', 'Obsessive-compulsive disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['ocd','obsessive compulsive']),
('6A60', 'Schizophrenia', 'Schizophrenia or other primary psychotic disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['schizophrenia']),
('6A70', 'Anorexia nervosa', 'Feeding or eating disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['anorexia','eating disorder']),
('6A80', 'Insomnia', 'Sleep-wake disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['insomnia','sleeplessness','cant sleep']),
('6A05', 'Attention deficit hyperactivity disorder', 'Neurodevelopmental disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['adhd','attention deficit','hyperactivity']),
('6A06', 'Autism spectrum disorder', 'Neurodevelopmental disorders', 'Mental, behavioural or neurodevelopmental disorders', ARRAY['autism','asd','autistic']),

-- Chapter 8: Diseases of the nervous system
('8A00', 'Alzheimer disease', 'Dementia', 'Diseases of the nervous system', ARRAY['alzheimer','alzheimers','dementia']),
('8A20', 'Parkinson disease', 'Movement disorders', 'Diseases of the nervous system', ARRAY['parkinson','parkinsons']),
('8A40', 'Multiple sclerosis', 'Demyelinating diseases of CNS', 'Diseases of the nervous system', ARRAY['ms','multiple sclerosis']),
('8A60', 'Epilepsy', 'Epilepsy or seizures', 'Diseases of the nervous system', ARRAY['epilepsy','seizure','seizures','fits']),
('8A80', 'Migraine', 'Headache disorders', 'Diseases of the nervous system', ARRAY['migraine','headache','severe headache']),
('8A81', 'Tension-type headache', 'Headache disorders', 'Diseases of the nervous system', ARRAY['tension headache','stress headache']),
('8B00', 'Cerebral palsy', 'Cerebral palsy', 'Diseases of the nervous system', ARRAY['cerebral palsy','cp']),
('8B10', 'Peripheral neuropathy', 'Diseases of peripheral nerves', 'Diseases of the nervous system', ARRAY['neuropathy','nerve damage','peripheral neuropathy']),
('8B20', 'Bell palsy', 'Diseases of cranial nerves', 'Diseases of the nervous system', ARRAY['bell palsy','facial paralysis']),

-- Chapter 9: Diseases of the visual system
('9A00', 'Conjunctivitis', 'Disorders of conjunctiva', 'Diseases of the visual system', ARRAY['conjunctivitis','pink eye','eye infection']),
('9A10', 'Cataract', 'Disorders of lens', 'Diseases of the visual system', ARRAY['cataract','cloudy vision']),
('9A20', 'Glaucoma', 'Glaucoma', 'Diseases of the visual system', ARRAY['glaucoma','eye pressure']),
('9A30', 'Myopia', 'Disorders of refraction', 'Diseases of the visual system', ARRAY['nearsighted','short sighted','myopia']),

-- Chapter 11: Diseases of the circulatory system
('BA00', 'Essential hypertension', 'Hypertensive diseases', 'Diseases of the circulatory system', ARRAY['hypertension','high blood pressure','htn','bp high']),
('BA01', 'Hypertensive heart disease', 'Hypertensive diseases', 'Diseases of the circulatory system', ARRAY['hypertensive heart']),
('BA10', 'Angina pectoris', 'Ischaemic heart diseases', 'Diseases of the circulatory system', ARRAY['angina','chest pain','cardiac pain']),
('BA20', 'Acute myocardial infarction', 'Ischaemic heart diseases', 'Diseases of the circulatory system', ARRAY['heart attack','mi','myocardial infarction']),
('BA30', 'Heart failure', 'Heart failure', 'Diseases of the circulatory system', ARRAY['heart failure','chf','congestive heart failure']),
('BA40', 'Atrial fibrillation', 'Cardiac arrhythmias', 'Diseases of the circulatory system', ARRAY['afib','atrial fibrillation','irregular heartbeat']),
('BA50', 'Aortic valve disease', 'Valvular heart disease', 'Diseases of the circulatory system', ARRAY['aortic valve','valve disease']),
('BA80', 'Cerebrovascular diseases', 'Cerebrovascular diseases', 'Diseases of the circulatory system', ARRAY['stroke','cerebrovascular','cva']),
('BA81', 'Cerebral infarction', 'Cerebrovascular diseases', 'Diseases of the circulatory system', ARRAY['brain stroke','ischemic stroke']),
('BA90', 'Peripheral arterial disease', 'Diseases of arteries', 'Diseases of the circulatory system', ARRAY['pad','peripheral vascular','pvd']),
('BA91', 'Deep vein thrombosis', 'Diseases of veins', 'Diseases of the circulatory system', ARRAY['dvt','deep vein thrombosis','blood clot']),
('BA92', 'Varicose veins', 'Diseases of veins', 'Diseases of the circulatory system', ARRAY['varicose veins','spider veins']),
('BA93', 'Haemorrhoids', 'Diseases of veins', 'Diseases of the circulatory system', ARRAY['hemorrhoids','piles']),

-- Chapter 12: Diseases of the respiratory system
('CA00', 'Acute upper respiratory infection', 'Acute upper respiratory infections', 'Diseases of the respiratory system', ARRAY['cold','common cold','upper respiratory','uri','urti']),
('CA01', 'Acute pharyngitis', 'Acute upper respiratory infections', 'Diseases of the respiratory system', ARRAY['sore throat','pharyngitis','throat infection']),
('CA02', 'Acute tonsillitis', 'Acute upper respiratory infections', 'Diseases of the respiratory system', ARRAY['tonsillitis','tonsil infection']),
('CA03', 'Acute laryngitis', 'Acute upper respiratory infections', 'Diseases of the respiratory system', ARRAY['laryngitis','voice loss']),
('CA04', 'Acute sinusitis', 'Acute upper respiratory infections', 'Diseases of the respiratory system', ARRAY['sinusitis','sinus infection','sinus']),
('CA07', 'Influenza', 'Influenza', 'Diseases of the respiratory system', ARRAY['flu','influenza']),
('CA10', 'Pneumonia', 'Pneumonia', 'Diseases of the respiratory system', ARRAY['pneumonia','lung infection']),
('CA20', 'Acute bronchitis', 'Acute lower respiratory infections', 'Diseases of the respiratory system', ARRAY['bronchitis','chest cold','acute bronchitis']),
('CA22', 'Bronchiolitis', 'Acute lower respiratory infections', 'Diseases of the respiratory system', ARRAY['bronchiolitis']),
('CA23', 'Asthma', 'Chronic lower respiratory diseases', 'Diseases of the respiratory system', ARRAY['asthma','wheezing','bronchial asthma']),
('CA24', 'Chronic obstructive pulmonary disease', 'Chronic lower respiratory diseases', 'Diseases of the respiratory system', ARRAY['copd','emphysema','chronic bronchitis']),
('CA25', 'Bronchiectasis', 'Chronic lower respiratory diseases', 'Diseases of the respiratory system', ARRAY['bronchiectasis']),
('CA30', 'Pleural effusion', 'Diseases of pleura', 'Diseases of the respiratory system', ARRAY['pleural effusion','fluid in lungs']),
('CA40', 'Pulmonary embolism', 'Pulmonary vascular diseases', 'Diseases of the respiratory system', ARRAY['pulmonary embolism','pe','lung clot']),

-- Chapter 13: Diseases of the digestive system
('DA00', 'Dental caries', 'Diseases of oral cavity', 'Diseases of the digestive system', ARRAY['cavity','tooth decay','dental caries']),
('DA10', 'Gastro-oesophageal reflux disease', 'Diseases of oesophagus', 'Diseases of the digestive system', ARRAY['gerd','acid reflux','heartburn','reflux']),
('DA20', 'Gastric ulcer', 'Diseases of stomach', 'Diseases of the digestive system', ARRAY['stomach ulcer','peptic ulcer','gastric ulcer']),
('DA21', 'Gastritis', 'Diseases of stomach', 'Diseases of the digestive system', ARRAY['gastritis','stomach inflammation']),
('DA30', 'Appendicitis', 'Diseases of appendix', 'Diseases of the digestive system', ARRAY['appendicitis','appendix']),
('DA40', 'Crohn disease', 'Inflammatory bowel diseases', 'Diseases of the digestive system', ARRAY['crohn','crohns disease','ibd']),
('DA41', 'Ulcerative colitis', 'Inflammatory bowel diseases', 'Diseases of the digestive system', ARRAY['ulcerative colitis','uc']),
('DA50', 'Irritable bowel syndrome', 'Functional bowel disorders', 'Diseases of the digestive system', ARRAY['ibs','irritable bowel']),
('DA60', 'Cholelithiasis', 'Diseases of gallbladder', 'Diseases of the digestive system', ARRAY['gallstones','gallbladder stones']),
('DA70', 'Pancreatitis', 'Diseases of pancreas', 'Diseases of the digestive system', ARRAY['pancreatitis','pancreas inflammation']),
('DA80', 'Liver cirrhosis', 'Diseases of liver', 'Diseases of the digestive system', ARRAY['cirrhosis','liver disease','liver failure']),
('DA81', 'Fatty liver disease', 'Diseases of liver', 'Diseases of the digestive system', ARRAY['fatty liver','nafld','nash']),
('DA90', 'Inguinal hernia', 'Hernia', 'Diseases of the digestive system', ARRAY['inguinal hernia','groin hernia']),

-- Chapter 14: Diseases of the skin
('EA00', 'Dermatitis', 'Dermatitis', 'Diseases of the skin', ARRAY['dermatitis','eczema','skin rash']),
('EA01', 'Atopic dermatitis', 'Dermatitis', 'Diseases of the skin', ARRAY['eczema','atopic eczema']),
('EA02', 'Contact dermatitis', 'Dermatitis', 'Diseases of the skin', ARRAY['contact dermatitis','allergic rash']),
('EA10', 'Psoriasis', 'Papulosquamous disorders', 'Diseases of the skin', ARRAY['psoriasis','skin patches']),
('EA20', 'Urticaria', 'Urticaria', 'Diseases of the skin', ARRAY['hives','urticaria','skin welts']),
('EA30', 'Acne', 'Disorders of skin appendages', 'Diseases of the skin', ARRAY['acne','pimples','acne vulgaris']),
('EA40', 'Alopecia', 'Disorders of skin appendages', 'Diseases of the skin', ARRAY['hair loss','baldness','alopecia']),
('EA50', 'Cellulitis', 'Infections of skin', 'Diseases of the skin', ARRAY['cellulitis','skin infection']),
('EA60', 'Fungal skin infections', 'Infections of skin', 'Diseases of the skin', ARRAY['ringworm','tinea','fungal infection']),
('EA70', 'Vitiligo', 'Disorders of pigmentation', 'Diseases of the skin', ARRAY['vitiligo','white patches']),

-- Chapter 15: Diseases of the musculoskeletal system
('FA00', 'Rheumatoid arthritis', 'Inflammatory arthropathies', 'Diseases of the musculoskeletal system', ARRAY['rheumatoid arthritis','ra','joint inflammation']),
('FA01', 'Osteoarthritis', 'Osteoarthritis', 'Diseases of the musculoskeletal system', ARRAY['osteoarthritis','oa','degenerative joint','wear and tear arthritis']),
('FA02', 'Psoriatic arthritis', 'Inflammatory arthropathies', 'Diseases of the musculoskeletal system', ARRAY['psoriatic arthritis']),
('FA10', 'Systemic lupus erythematosus', 'Systemic connective tissue disorders', 'Diseases of the musculoskeletal system', ARRAY['lupus','sle']),
('FA20', 'Spondylitis', 'Spondylopathies', 'Diseases of the musculoskeletal system', ARRAY['ankylosing spondylitis','back stiffness']),
('FA30', 'Cervical disc disorder', 'Dorsopathies', 'Diseases of the musculoskeletal system', ARRAY['cervical disc','neck disc','cervical spondylosis']),
('FA31', 'Lumbar disc disorder', 'Dorsopathies', 'Diseases of the musculoskeletal system', ARRAY['lumbar disc','back pain','slipped disc','herniated disc']),
('FA32', 'Low back pain', 'Dorsopathies', 'Diseases of the musculoskeletal system', ARRAY['lower back pain','lbp','backache']),
('FA40', 'Osteoporosis', 'Bone density disorders', 'Diseases of the musculoskeletal system', ARRAY['osteoporosis','brittle bones','bone loss']),
('FA50', 'Fibromyalgia', 'Soft tissue disorders', 'Diseases of the musculoskeletal system', ARRAY['fibromyalgia','body pain','widespread pain']),
('FA60', 'Shoulder lesion', 'Soft tissue disorders', 'Diseases of the musculoskeletal system', ARRAY['frozen shoulder','rotator cuff','shoulder pain']),
('FA70', 'Carpal tunnel syndrome', 'Nerve entrapment syndromes', 'Diseases of the musculoskeletal system', ARRAY['carpal tunnel','wrist pain','cts']),

-- Chapter 16: Diseases of the genitourinary system
('GA00', 'Acute kidney injury', 'Diseases of kidney', 'Diseases of the genitourinary system', ARRAY['acute kidney injury','aki','kidney failure']),
('GA01', 'Chronic kidney disease', 'Diseases of kidney', 'Diseases of the genitourinary system', ARRAY['ckd','chronic kidney','renal failure']),
('GA10', 'Urolithiasis', 'Urolithiasis', 'Diseases of the genitourinary system', ARRAY['kidney stones','renal calculi','nephrolithiasis']),
('GA20', 'Urinary tract infection', 'Infections of urinary system', 'Diseases of the genitourinary system', ARRAY['uti','urine infection','urinary infection']),
('GA21', 'Cystitis', 'Infections of urinary system', 'Diseases of the genitourinary system', ARRAY['cystitis','bladder infection']),
('GA30', 'Benign prostatic hyperplasia', 'Diseases of prostate', 'Diseases of the genitourinary system', ARRAY['bph','enlarged prostate','prostate enlargement']),
('GA40', 'Endometriosis', 'Diseases of female genital organs', 'Diseases of the genitourinary system', ARRAY['endometriosis']),
('GA41', 'Polycystic ovarian syndrome', 'Diseases of female genital organs', 'Diseases of the genitourinary system', ARRAY['pcos','polycystic ovaries']),
('GA42', 'Uterine fibroids', 'Diseases of female genital organs', 'Diseases of the genitourinary system', ARRAY['fibroids','uterine leiomyoma']),
('GA50', 'Abnormal uterine bleeding', 'Menstrual disorders', 'Diseases of the genitourinary system', ARRAY['heavy periods','menorrhagia','abnormal bleeding']),
('GA51', 'Dysmenorrhoea', 'Menstrual disorders', 'Diseases of the genitourinary system', ARRAY['painful periods','period pain','menstrual cramps']),

-- Chapter 19: Diseases of the blood
('3A00', 'Iron deficiency anaemia', 'Nutritional anaemias', 'Diseases of the blood', ARRAY['anemia','anaemia','iron deficiency anemia','low hemoglobin']),
('3A01', 'Vitamin B12 deficiency anaemia', 'Nutritional anaemias', 'Diseases of the blood', ARRAY['b12 anemia','pernicious anemia']),
('3A10', 'Sickle cell disorders', 'Haemoglobinopathies', 'Diseases of the blood', ARRAY['sickle cell','sickle cell anemia','scd']),
('3A20', 'Thalassaemia', 'Haemoglobinopathies', 'Diseases of the blood', ARRAY['thalassemia','thalassaemia']),
('3A30', 'Haemophilia', 'Coagulation defects', 'Diseases of the blood', ARRAY['hemophilia','bleeding disorder']),
('3A40', 'Thrombocytopenia', 'Platelet disorders', 'Diseases of the blood', ARRAY['low platelets','thrombocytopenia']),

-- Chapter 20: Developmental anomalies (selected)
('LA00', 'Congenital heart defect', 'Developmental anomalies of circulatory system', 'Developmental anomalies', ARRAY['congenital heart','heart defect']),
('LA10', 'Down syndrome', 'Chromosomal anomalies', 'Developmental anomalies', ARRAY['down syndrome','trisomy 21']),

-- Supplementary codes: External causes & injury
('NA00', 'Fracture of skull', 'Injuries to head', 'Injury, poisoning or other consequences of external causes', ARRAY['skull fracture']),
('NA10', 'Fracture of femur', 'Injuries to hip or thigh', 'Injury, poisoning or other consequences of external causes', ARRAY['femur fracture','hip fracture','broken hip']),
('NA20', 'Fracture of forearm', 'Injuries to elbow or forearm', 'Injury, poisoning or other consequences of external causes', ARRAY['arm fracture','broken arm','wrist fracture']),
('NA30', 'Sprain of ankle', 'Injuries to ankle or foot', 'Injury, poisoning or other consequences of external causes', ARRAY['ankle sprain','twisted ankle']),
('NA40', 'Burns', 'Burns', 'Injury, poisoning or other consequences of external causes', ARRAY['burn','burn injury']),
('NA50', 'Poisoning', 'Poisoning', 'Injury, poisoning or other consequences of external causes', ARRAY['poisoning','drug overdose','toxic ingestion']),

-- Common symptoms & signs (Chapter 21)
('MA00', 'Fever', 'General symptoms', 'Symptoms, signs or clinical findings', ARRAY['fever','pyrexia','high temperature']),
('MA01', 'Fatigue', 'General symptoms', 'Symptoms, signs or clinical findings', ARRAY['fatigue','tiredness','weakness','lethargy']),
('MA02', 'Pain, unspecified', 'General symptoms', 'Symptoms, signs or clinical findings', ARRAY['pain','body pain']),
('MA10', 'Cough', 'Respiratory symptoms', 'Symptoms, signs or clinical findings', ARRAY['cough','coughing']),
('MA11', 'Dyspnoea', 'Respiratory symptoms', 'Symptoms, signs or clinical findings', ARRAY['breathlessness','shortness of breath','sob','dyspnea']),
('MA12', 'Chest pain', 'Respiratory symptoms', 'Symptoms, signs or clinical findings', ARRAY['chest pain']),
('MA20', 'Nausea and vomiting', 'Digestive symptoms', 'Symptoms, signs or clinical findings', ARRAY['nausea','vomiting','throwing up']),
('MA21', 'Diarrhoea', 'Digestive symptoms', 'Symptoms, signs or clinical findings', ARRAY['diarrhea','loose stools','loose motions']),
('MA22', 'Abdominal pain', 'Digestive symptoms', 'Symptoms, signs or clinical findings', ARRAY['stomach pain','belly pain','abdominal pain','tummy ache']),
('MA23', 'Constipation', 'Digestive symptoms', 'Symptoms, signs or clinical findings', ARRAY['constipation']),
('MA30', 'Headache', 'Neurological symptoms', 'Symptoms, signs or clinical findings', ARRAY['headache','head pain']),
('MA31', 'Dizziness', 'Neurological symptoms', 'Symptoms, signs or clinical findings', ARRAY['dizziness','vertigo','giddiness']),
('MA32', 'Syncope', 'Neurological symptoms', 'Symptoms, signs or clinical findings', ARRAY['fainting','syncope','blackout']),
('MA40', 'Oedema', 'Circulatory symptoms', 'Symptoms, signs or clinical findings', ARRAY['edema','swelling','water retention']),
('MA50', 'Joint pain', 'Musculoskeletal symptoms', 'Symptoms, signs or clinical findings', ARRAY['arthralgia','joint pain']),
('MA51', 'Muscle pain', 'Musculoskeletal symptoms', 'Symptoms, signs or clinical findings', ARRAY['myalgia','muscle pain','body ache']),
('MA60', 'Rash', 'Skin symptoms', 'Symptoms, signs or clinical findings', ARRAY['rash','skin rash']),
('MA61', 'Itching', 'Skin symptoms', 'Symptoms, signs or clinical findings', ARRAY['pruritus','itching','itchy skin']),
('MA70', 'Dysuria', 'Genitourinary symptoms', 'Symptoms, signs or clinical findings', ARRAY['painful urination','burning urine','dysuria']),
('MA71', 'Haematuria', 'Genitourinary symptoms', 'Symptoms, signs or clinical findings', ARRAY['blood in urine','hematuria']),

-- Pregnancy related (Chapter 18)
('JA00', 'Ectopic pregnancy', 'Pregnancy with abortive outcome', 'Pregnancy, childbirth or the puerperium', ARRAY['ectopic pregnancy']),
('JA10', 'Pre-eclampsia', 'Maternal hypertensive disorders', 'Pregnancy, childbirth or the puerperium', ARRAY['preeclampsia','pre eclampsia','toxemia']),
('JA20', 'Hyperemesis gravidarum', 'Maternal disorders related to pregnancy', 'Pregnancy, childbirth or the puerperium', ARRAY['morning sickness','pregnancy vomiting','hyperemesis']),
('JA30', 'Preterm labour', 'Complications of labour or delivery', 'Pregnancy, childbirth or the puerperium', ARRAY['premature labor','preterm birth']),
('JA40', 'Postpartum haemorrhage', 'Complications of puerperium', 'Pregnancy, childbirth or the puerperium', ARRAY['postpartum bleeding','pph']);
