//
//  PromocodeViewController.swift
//  FreeRide
//
//  Created by Rui Magalhães on 20/04/2020.
//  Copyright © 2020 Rocket & Mouse Inc. All rights reserved.
//

import Foundation
import UIKit

extension Notification.Name {
    static let didUpdatePromocode = Notification.Name("didUpdatePromocode")
}

class PromocodeViewController: FormViewController {
    
    private let promocodeField: TextField = {
        let field = TextField()
        field.configure(name: "payments_promocode".localize(), placeholder: "payments_promocode".localize())
        field.image = #imageLiteral(resourceName: "round_redeem_black_18pt")
        field.validators = [RequiredValidator()]
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        return field
    }()
    
    private lazy var addPromocodeView: FormActionView = {
        let view: FormActionView = .instantiateFromNib()
        view.configure(button: "payments_save_pc".localize(), accessibilityLabel: "accessibility_text_add_promo_code".localize(), action: {
            guard self.promocodeField.validate() else {
                return
            }
            
            guard let location = self.context.currentLocation?.id else {
                return
            }
            
            let req = PromocodeRequest(locationId: location, promocode: self.promocodeField.inputText)
            ProgressHUD.show()
            self.context.api.addPromocode(req) { result in
                ProgressHUD.dismiss()
                switch result {
                case .success(_):
                    Notification.post(.didUpdatePaymentMethod)
                    MixpanelManager.trackEvent(MixpanelEvents.RIDER_PROMOCODE_ADDED)
                    self.dismiss(animated: true)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        })
        return view
    }()
    
    override func viewDidLoad() {
        
        actionViews = [addPromocodeView]
        
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        
        title = "payments_add_pc".localize()
            
        view.backgroundColor = Theme.Colors.backgroundGray
        
        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)
        
        fieldsStackView.addArrangedSubview(promocodeField)
        promocodeField.translatesAutoresizingMaskIntoConstraints = false
        promocodeField.pinHorizontalEdges(to: fieldsStackView, constant: 20)

        super.viewDidLoad()
    }

}
