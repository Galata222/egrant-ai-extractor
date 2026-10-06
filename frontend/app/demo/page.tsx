import { SiteHeader } from "@/components/site-header";
import FileUploadDemo from "@/components/ui/advanced-file-upload";

export default function DemoOne() {
  return (
    <div className="min-h-dvh bg-canvas pt-[4.75rem] text-ink">
      <SiteHeader />
      <FileUploadDemo />
    </div>
  );
}
