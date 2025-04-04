//
//  VehicleCheckOutViewController.swift
//  FreeRide
//

import Foundation
import UIKit

extension Notification.Name {
    static let didCheckOutVehicle = Notification.Name("didCheckOutVehicle")
}
class VehicleCheckOutViewController: FormViewController {
    
    private let publicIdField: TextField = {
        let field = TextField()
        field.configure(name: "Vehicle Public Id", placeholder: "Vehicle Public Id")
        field.image = #imageLiteral(resourceName: "round_directions_bus_black_24pt")
        field.validators = [RequiredValidator()]
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        return field
    }()
    
    override func viewDidLoad() {
        
        fields = [publicIdField]
        
        leftNavigationStyle = .close
        leftNavigationAction = .dismiss(true)
        title = "Vehicle Check Out"
            
        view.backgroundColor = Theme.Colors.backgroundGray
        
        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)
        
        confirmationButtonTitle = "Check Out Vehicle"
        
        super.viewDidLoad()
    }
    
    override func handleConfirmationAction() {
//        guard self.publicIdField.validate() else {
//            return
//        }
        //missing the call for the vehicle and inspection
        self.dismiss(animated: true, completion: {
            Notification.post(.didCheckOutVehicle)
        })
    }

}
