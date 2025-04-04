//
//  RouteBottomView.swift
//  FreeRide
//

import UIKit

protocol RouteBottomViewDelegate: AnyObject {
    func confirmRoute()
}

class RouteBottomView: BottomCardView {

    weak var delegate: RouteBottomViewDelegate?
    
    @IBOutlet var subtitleLabel: Label!
    @IBOutlet private weak var confirmRouteButton: Button?
    
    func configure(with route: String) {
        subtitleLabel.text = route
    }
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(200)
        subtitleLabel.style = .subtitle3blue
        subtitleLabel.textColor = Theme.Colors.darkGray
        confirmRouteButton?.style = .primary
        confirmRouteButton?.setTitle("ride_request_confirm_route".localize(), for: .normal)
    }
        
    @IBAction private func confirmRouteAction() {
        delegate?.confirmRoute()
    }
 
}
