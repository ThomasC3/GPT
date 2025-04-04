//
//  PassengerPickerView.swift
//  FreeRide
//

import UIKit

class QuoteInfoView: UIView {
    
    @IBOutlet weak var quoteTitleLabel: Label!
    @IBOutlet weak var quoteLabel: Label!
    

    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(90)
                
        quoteTitleLabel.style = .subtitle6blue
        quoteTitleLabel.textColor = Theme.Colors.seaFoam
        quoteTitleLabel.text = "ride_request_ride_value".localize()
        quoteLabel.style = .subtitle3darkgray
        quoteLabel.numberOfLines = 0
    }
    
    func setQuote(quote: String) {
        quoteLabel.text = quote
    }

}
