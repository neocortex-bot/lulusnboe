CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Master admin manages roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.is_master_admin(auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "Admins manage sessions" ON public.exam_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can update own session" ON public.exam_sessions FOR UPDATE TO authenticated USING (current_candidate_id = auth.uid());
CREATE POLICY "Candidates can read own session"
ON public.exam_sessions FOR SELECT TO authenticated
USING (current_candidate_id = auth.uid());
CREATE POLICY "Candidates can claim unclaimed session" ON public.exam_sessions FOR UPDATE TO authenticated
  USING (current_candidate_id IS NULL)
  WITH CHECK (current_candidate_id = auth.uid() AND (public.is_master_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.exam_access ea WHERE ea.user_id = auth.uid() AND ea.allowed)));

CREATE POLICY "Admins manage results" ON public.exam_results FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can read own results" ON public.exam_results FOR SELECT USING (candidate_id = auth.uid());
CREATE POLICY "Candidates can insert own results" ON public.exam_results FOR INSERT WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Admins manage sequence items" ON public.exam_sequence_items
FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public read sequence items" ON public.exam_sequence_items
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins read chat messages" ON public.chat_messages
FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated insert chat" ON public.chat_messages
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM exam_sessions WHERE id = session_id AND current_candidate_id = auth.uid())
);
CREATE POLICY "Candidates can read own session chat"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_sessions
    WHERE exam_sessions.id = chat_messages.session_id
    AND exam_sessions.current_candidate_id = auth.uid()
  )
);

CREATE POLICY "Candidates can read assigned cases"
ON public.clinical_cases FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_sessions
    WHERE exam_sessions.case_id = clinical_cases.id
    AND exam_sessions.current_candidate_id = auth.uid()
  )
);
CREATE POLICY "Admins read all cases" ON public.clinical_cases
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create cases" ON public.clinical_cases
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or master admin update cases" ON public.clinical_cases
FOR UPDATE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid()))
WITH CHECK (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid()));
CREATE POLICY "Owner or master admin delete cases" ON public.clinical_cases
FOR DELETE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid()));
CREATE POLICY "Public read published cases"
  ON public.clinical_cases FOR SELECT TO anon
  USING (status = 'published');
CREATE POLICY "Authenticated read published or own drafts"
  ON public.clinical_cases FOR SELECT TO authenticated
  USING (status = 'published' OR created_by = auth.uid());

CREATE POLICY "Admins read answer keys" ON public.case_answer_keys
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or master admin write answer keys" ON public.case_answer_keys
FOR INSERT TO authenticated
WITH CHECK (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));
CREATE POLICY "Owner or master admin update answer keys" ON public.case_answer_keys
FOR UPDATE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)))
WITH CHECK (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));
CREATE POLICY "Owner or master admin delete answer keys" ON public.case_answer_keys
FOR DELETE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));

CREATE POLICY "Admins read assets" ON public.case_assets
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or master admin write assets" ON public.case_assets
FOR INSERT TO authenticated
WITH CHECK (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));
CREATE POLICY "Owner or master admin update assets" ON public.case_assets
FOR UPDATE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)))
WITH CHECK (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));
CREATE POLICY "Owner or master admin delete assets" ON public.case_assets
FOR DELETE TO authenticated
USING (public.is_master_admin(auth.uid()) OR (public.has_role(auth.uid(), 'admin') AND public.owns_case(auth.uid(), case_id)));
CREATE POLICY "Candidates can read assigned assets"
ON public.case_assets FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM exam_sessions
    WHERE exam_sessions.case_id = case_assets.case_id
    AND exam_sessions.current_candidate_id = auth.uid()
  )
);

CREATE POLICY "Master admin manages exam access" ON public.exam_access FOR ALL TO authenticated
  USING (public.is_master_admin(auth.uid())) WITH CHECK (public.is_master_admin(auth.uid()));
CREATE POLICY "Users read own exam access" ON public.exam_access FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can upload case assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'case-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read case assets" ON storage.objects FOR SELECT USING (bucket_id = 'case-assets');
CREATE POLICY "Admins can delete case assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'case-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can upload exam audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'exam-audio');
CREATE POLICY "Admins can read exam audio" ON storage.objects FOR SELECT USING (bucket_id = 'exam-audio' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can read own exam audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'exam-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admins can delete exam audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exam-audio' AND public.has_role(auth.uid(), 'admin'));