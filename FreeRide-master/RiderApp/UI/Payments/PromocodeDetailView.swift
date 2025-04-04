//
//  PromocodeDetailView.swift
//  FreeRide
//

import Foundation

protocol PromocodeDetailDelegate: AnyObject {
   func didSelectPromocodeEdit()
   func didSelectPromocodeDelete()
}

class PromocodeDetailView: PaymentDetailView {

    weak var promocodeDelegate: PromocodeDetailDelegate?

    override func configure(title: String?, info: String?) {
        super.configure(title: title, info: info)
        imageView.originalImage = #imageLiteral(resourceName: "round_redeem_black_24pt")
        editButton.setTitle(title == nil ? "payments_add_pc".localize() : "general_edit".localize(), for: .normal)
        editButton.addTarget(self, action: #selector(editPromocodeAction), for: .touchUpInside)
        editButton.accessibilityLabel = title == nil ? "accessibility_text_add_promo_code".localize() : "accessibility_text_edit_promo_code".localize()
        deleteButton.addTarget(self, action: #selector(deletePromocodeAction), for: .touchUpInside)
        deleteButton.accessibilityLabel = "accessibility_text_remove_promo_code".localize()
    }
    
    func configure(_ promocode: Promocode!) {
        self.configure(title: promocode.getTitleWithValue(), info: "\(promocode.getInfo())\(promocode.getAdditionalInfo())")
        infoLabel.style = promocode.isPromocodeValid ? .subtitle2darkgray : .subtitle2tangerine
    }
    
    @objc func editPromocodeAction() {
        promocodeDelegate?.didSelectPromocodeEdit()
    }

    @objc func deletePromocodeAction() {
        promocodeDelegate?.didSelectPromocodeDelete()
    }
}
