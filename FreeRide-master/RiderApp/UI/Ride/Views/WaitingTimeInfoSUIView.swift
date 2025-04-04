//
//  WaitingTimeInfoSUIView.swift
//  FreeRide
//
//  Created by Ricardo Pereira on 16/11/2024.
//  Copyright © 2024 Circuit. All rights reserved.
//

import SwiftUI

struct WaitingTimeInfoSUIView: View {

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Green background
            SwiftUITheme.Colors.narvik
                .ignoresSafeArea()

            VStack {
                // Close button container
                HStack {
                    Spacer()
                    SwiftUI.Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(SwiftUITheme.Colors.kelp)
                            .padding(20)
                    }
                }
                Spacer()
            }

            VStack(spacing: 24) {
                Image("CarCircuitWithPassengers")
                    .resizable()
                    .scaledToFit()
                    .frame(width: UIScreen.main.bounds.width * 0.8)
                    .padding(.vertical, 32)

                Text("rider_why_can_wait_times_vary".localize())
                    .font(SwiftUITheme.Fonts.largeTitle1)
                    .foregroundColor(SwiftUITheme.Colors.kelp)
                    .padding(.horizontal, 24)

                Text("rider_route_is_optimized".localize())
                    .multilineTextAlignment(.center)
                    .font(SwiftUITheme.Fonts.body7)
                    .foregroundColor(SwiftUITheme.Colors.kelp)
                    .padding(.horizontal, 32)

                Text("rider_keep_eye_on_app".localize())
                    .multilineTextAlignment(.center)
                    .font(SwiftUITheme.Fonts.body7)
                    .foregroundColor(SwiftUITheme.Colors.kelp)
                    .padding(.horizontal, 32)
            }
            .padding(.vertical, 24)
        }
    }

}

struct CircuitView_Previews: PreviewProvider {
    static var previews: some View {
        WaitingTimeInfoSUIView()
    }
}
