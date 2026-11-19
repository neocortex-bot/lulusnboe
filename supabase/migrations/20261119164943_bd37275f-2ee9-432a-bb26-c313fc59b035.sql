ALTER FUNCTION public.deploy_exam_batch(uuid,jsonb) SECURITY INVOKER;
GRANT SELECT,INSERT ON public.exam_deployment_requests TO authenticated;
CREATE POLICY "Admins read deployment requests" ON public.exam_deployment_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "Admins create deployment requests" ON public.exam_deployment_requests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));