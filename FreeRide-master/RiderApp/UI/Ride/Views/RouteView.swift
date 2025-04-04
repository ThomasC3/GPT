//
//  RouteView.swift
//  FreeRide
//

import UIKit

class RouteView: UIView {
    
    @IBOutlet weak var labelTo: Label!
    @IBOutlet weak var labelFrom: Label!
    @IBOutlet weak var labelTitleTo: Label!
    @IBOutlet weak var labelTitleFrom: Label!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        
        labelTo.style = .subtitle3bluegray
        labelFrom.style = .subtitle3bluegray
        labelTitleTo.style = .subtitle3bluegray
        labelTitleFrom.style = .subtitle3bluegray
        
        labelTitleFrom.text = "from\n"
        labelTitleTo.text = "to"
    }
    
    func setRoute(origin: String, destination: String) {
        labelFrom.text = origin
        labelTo.text = destination
        
        if labelFrom.countLines() < 2 {
            labelFrom.text = (labelFrom.text ?? "") + "\n"
        }
        
        if labelTo.countLines() < 2 {
            labelTitleTo.text = "\nto"
            labelTo.text = "\n" + (labelTo.text ?? "")
        }
        
    }

}
