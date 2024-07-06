import { FC } from "react";
import { Layout } from "../components/Layout";
import UploadZone from "../components/UploadZone";

export const IndexPage: FC = () => {
	return (
		<Layout>
			{/* Open the modal using document.getElementById('ID').showModal() method */}
			<button
				className="btn"
				onClick={() =>
					(document.getElementById("my_modal_1") as HTMLDialogElement)?.showModal()
				}
			>
				open modal
			</button>
			<dialog id="my_modal_1" className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Upload pictures!</h3>
					<p className="py-4">
						Press ESC key or click the button below to close
					</p>
          <UploadZone />
					<div className="modal-action">
						<form method="dialog">
							{/* if there is a button in form, it will close the modal */}
							<button className="btn">Close</button>
						</form>
					</div>
				</div>
			</dialog>
		</Layout>
	);
};
